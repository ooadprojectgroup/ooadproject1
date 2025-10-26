package com.dvpgiftcenter.service;
import com.dvpgiftcenter.dto.cashier.CashierProductDto;
import com.dvpgiftcenter.dto.customer.CustomerSummaryDto;
import com.dvpgiftcenter.dto.cashier.PosTransactionRequest;
import com.dvpgiftcenter.dto.cashier.PosTransactionResponse;
import com.dvpgiftcenter.dto.cashier.PosTransactionSummaryDto;
import com.dvpgiftcenter.entity.Inventory;
import com.dvpgiftcenter.entity.Payment;
import com.dvpgiftcenter.entity.Product;
import com.dvpgiftcenter.entity.StockMovement;
import com.dvpgiftcenter.entity.Transaction;
import com.dvpgiftcenter.entity.TransactionItem;
import com.dvpgiftcenter.entity.User;
import com.dvpgiftcenter.repository.InventoryRepository;
import com.dvpgiftcenter.repository.PaymentRepository;
import com.dvpgiftcenter.repository.ProductRepository;
import com.dvpgiftcenter.repository.StockMovementRepository;
import com.dvpgiftcenter.repository.TransactionItemRepository;
import com.dvpgiftcenter.repository.TransactionRepository;
import com.dvpgiftcenter.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class CashierService {

	@Autowired
	private ProductRepository productRepository;

	@Autowired
	private InventoryRepository inventoryRepository;

	@Autowired
	private TransactionRepository transactionRepository;

	@Autowired
	private TransactionItemRepository transactionItemRepository;

	@Autowired
	private PaymentRepository paymentRepository;

	@Autowired
	private StockMovementRepository stockMovementRepository;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private TaxRateService taxRateService;

	// Tax rate is provided by TaxRateService now

	// List all active products from Product table for POS
	public List<CashierProductDto> getInStoreProducts() {
		return productRepository.findByIsActiveTrueOrderByProductName()
				.stream()
				.map(this::mapToProductDto)
				.collect(Collectors.toList());
	}

	// Search by name/code/barcode
	public List<CashierProductDto> searchProducts(String query) {
		return productRepository
				.findByProductNameContainingIgnoreCaseOrProductCodeContainingIgnoreCaseOrBarcodeContainingIgnoreCase(query, query, query)
				.stream()
				.filter(p -> Boolean.TRUE.equals(p.getIsActive()))
				.map(this::mapToProductDto)
				.collect(Collectors.toList());
	}

	// Barcode quick lookup
	public CashierProductDto getProductByBarcode(String barcode) {
		return productRepository.findByBarcodeAndIsActiveTrue(barcode)
				.map(this::mapToProductDto)
				.orElse(null);
	}

	// List recent POS transactions with optional filters
	public List<PosTransactionSummaryDto> listPosTransactions(String bill, LocalDateTime start, LocalDateTime end) {
		List<Transaction> txs;
		if (bill != null && !bill.isBlank()) {
			txs = transactionRepository.findBySourceAndBillNumberContainingIgnoreCaseOrderByTransactionDateDesc("pos_sale", bill);
		} else if (start != null && end != null) {
			txs = transactionRepository.findBySourceAndTransactionDateBetweenOrderByTransactionDateDesc("pos_sale", start, end);
		} else {
			txs = transactionRepository.findTop100BySourceOrderByTransactionDateDesc("pos_sale");
		}
		return txs.stream().map(this::toSummaryDto).collect(Collectors.toList());
	}

	private PosTransactionSummaryDto toSummaryDto(Transaction tx) {
		PosTransactionSummaryDto dto = new PosTransactionSummaryDto();
		dto.setTransactionId(tx.getTransactionId());
		dto.setBillNumber(tx.getBillNumber());
		dto.setCustomerName(tx.getCustomer() != null ? tx.getCustomer().getFullName() : "Walk-in Customer");
		dto.setCashierName(tx.getUser() != null ? tx.getUser().getFullName() : null);
		dto.setTransactionDate(tx.getTransactionDate());
		dto.setNetAmount(tx.getNetAmount());
		dto.setStatus(tx.getStatus());
		return dto;
	}

	// Process POS transaction
	@Transactional
	public PosTransactionResponse processTransaction(PosTransactionRequest request) {
	// Customer (optional). If null, treat as Walk-in Customer.
	User customer = null;
	if (request.getCustomerId() != null) {
	    customer = userRepository.findById(request.getCustomerId())
		    .orElseThrow(() -> new IllegalArgumentException("Customer not found"));
	}

		// Cashier from security
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		User cashier = userRepository.findByUsername(auth.getName())
				.orElseThrow(() -> new IllegalArgumentException("Cashier not found"));

		Transaction tx = new Transaction();
	tx.setCustomer(customer); // may be null -> allowed by schema and entity
		tx.setUser(cashier);
		tx.setBillNumber(generateBillNumber(cashier.getUserId()));
		tx.setTransactionDate(LocalDateTime.now());
		tx.setTransactionType("sale");
		tx.setStatus("completed");
		tx.setSource("pos_sale");

		// First pass: validate stock and compute totals
	BigDecimal total = BigDecimal.ZERO;
	// Always compute tax based on current system tax rate to keep server authoritative
	BigDecimal tax;
		BigDecimal discount = request.getDiscountAmount() != null ? request.getDiscountAmount() : BigDecimal.ZERO;

		for (PosTransactionRequest.PosTransactionItem it : request.getItems()) {
			Product product = productRepository.findById(it.getProductId())
					.orElseThrow(() -> new IllegalArgumentException("Product not found: " + it.getProductId()));
			Inventory inv = inventoryRepository.findByProductProductId(product.getProductId())
					.orElseThrow(() -> new IllegalArgumentException("Product not in inventory: " + product.getProductName()));
			if (inv.getCurrentStock() < it.getQuantity()) {
				throw new IllegalArgumentException("Insufficient stock for product: " + product.getProductName());
			}
			BigDecimal line = it.getUnitPrice()
					.multiply(BigDecimal.valueOf(it.getQuantity()))
					.subtract(it.getDiscountAmount() == null ? BigDecimal.ZERO : it.getDiscountAmount());
			total = total.add(line);
		}

		tax = total.multiply(taxRateService.getTaxRate());

		tx.setTotalAmount(total);
		tx.setTaxAmount(tax);
		tx.setDiscountAmount(discount);
		tx.setNetAmount(total.add(tax).subtract(discount));

		// Save transaction header
		tx = transactionRepository.save(tx);

		// Persist items + update inventory + stock movement
		for (PosTransactionRequest.PosTransactionItem it : request.getItems()) {
			Product product = productRepository.findById(it.getProductId())
					.orElseThrow(() -> new IllegalArgumentException("Product not found: " + it.getProductId()));

			TransactionItem ti = new TransactionItem();
			ti.setTransaction(tx);
			ti.setProduct(product);
			ti.setQuantity(it.getQuantity());
			ti.setUnitPrice(it.getUnitPrice());
			ti.setDiscountAmount(it.getDiscountAmount() == null ? BigDecimal.ZERO : it.getDiscountAmount());
			ti.setTaxAmount(BigDecimal.ZERO);
			ti.setLineTotal(it.getUnitPrice()
					.multiply(BigDecimal.valueOf(it.getQuantity()))
					.subtract(it.getDiscountAmount() == null ? BigDecimal.ZERO : it.getDiscountAmount()));
			ti.setReturnQuantity(0);
			transactionItemRepository.save(ti);

			Inventory inv = inventoryRepository.findByProductProductId(product.getProductId())
					.orElseThrow(() -> new IllegalArgumentException("Product not in inventory: " + product.getProductName()));
			int prev = inv.getCurrentStock();
			inv.setCurrentStock(prev - it.getQuantity());
			inv.setLastUpdated(LocalDateTime.now());
			inventoryRepository.save(inv);

			StockMovement sm = new StockMovement();
			sm.setProduct(product);
			sm.setMovementType("sale");
			sm.setQuantityChange(-it.getQuantity());
			sm.setPreviousStock(prev);
			sm.setNewStock(inv.getCurrentStock());
			sm.setMovementDate(LocalDateTime.now());
			sm.setNotes("POS sale - " + product.getProductName());
			sm.setTransaction(tx);
			stockMovementRepository.save(sm);
		}

		Payment payment = new Payment();
		payment.setTransaction(tx);
		payment.setAmountPaid(tx.getNetAmount());
		payment.setPaymentMethod(request.getPaymentMethod());
		payment.setPaymentDate(LocalDateTime.now());
		payment.setStatus("success");
		payment.setReferenceNumber(generatePaymentReference(request.getPaymentMethod()));
		paymentRepository.save(payment);

		return buildResponse(tx);
	}

	public PosTransactionResponse getTransactionReceipt(Long transactionId) {
		Optional<Transaction> opt = transactionRepository.findById(transactionId);
		if (opt.isEmpty() || !"pos_sale".equals(opt.get().getSource())) {
			return null;
		}
		return buildResponse(opt.get());
	}

	private CashierProductDto mapToProductDto(Product p) {
		String categoryName = p.getCategory() != null ? p.getCategory().getCategoryName() : "Uncategorized";
		Integer stock = inventoryRepository.findByProductProductId(p.getProductId())
				.map(Inventory::getCurrentStock)
				.orElse(0);
		return new CashierProductDto(
				p.getProductId(),
				p.getProductName(),
				p.getProductCode(),
				p.getBarcode(),
				p.getDescription(),
				p.getUnitPrice(),
				categoryName,
				p.getImageUrl(),
				stock,
				p.getIsActive()
		);
	}

	private String generateBillNumber(Long userId) {
		LocalDateTime now = LocalDateTime.now();
		String datePart = now.format(DateTimeFormatter.ofPattern("yyMMdd"));
		String timePart = now.format(DateTimeFormatter.ofPattern("HHmmss"));
		String base = "DVP" + datePart + userId + timePart;
		// Handle rare collision for same user within the same second
		if (transactionRepository.findByBillNumber(base).isPresent()) {
			String milli = now.format(DateTimeFormatter.ofPattern("SSS"));
			String alt = base + milli;
			if (transactionRepository.findByBillNumber(alt).isPresent()) {
				String rnd = java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 2).toUpperCase();
				return alt + rnd;
			}
			return alt;
		}
		return base;
	}

	private String generatePaymentReference(String paymentMethod) {
		String methodCode = mapPaymentMethodCode(paymentMethod);
		java.util.Random rnd = new java.util.Random();
		String ts = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyMMddHHmmss"));
		for (int i = 0; i < 10; i++) {
			String rand4 = String.format("%04d", rnd.nextInt(10000));
			String ref = "REF-" + methodCode + ts + rand4;
			if (!paymentRepository.existsByReferenceNumber(ref)) {
				return ref;
			}
		}
		// Refresh timestamp and try again to keep the short format
		ts = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyMMddHHmmss"));
		for (int i = 0; i < 10; i++) {
			String rand4 = String.format("%04d", rnd.nextInt(10000));
			String ref = "REF-" + methodCode + ts + rand4;
			if (!paymentRepository.existsByReferenceNumber(ref)) {
				return ref;
			}
		}
		return "REF-" + methodCode + ts + String.format("%04d", rnd.nextInt(10000));
	}

	private String mapPaymentMethodCode(String paymentMethod) {
		if (paymentMethod == null) return "PAY";
		String pm = paymentMethod.trim().toLowerCase();
		if (pm.isEmpty()) return "PAY";
		if (pm.contains("cash on delivery") || pm.equals("cod")) return "COD";
		if (pm.contains("debit")) return "DC";
		if (pm.contains("credit")) return "CC";
		if (pm.contains("cash")) return "CASH";
		return "PAY";
	}

	private PosTransactionResponse buildResponse(Transaction tx) {
		PosTransactionResponse r = new PosTransactionResponse();
		r.setTransactionId(tx.getTransactionId());
		r.setBillNumber(tx.getBillNumber());
		r.setTransactionDate(tx.getTransactionDate());
		r.setCustomerName(tx.getCustomer() != null ? tx.getCustomer().getFullName() : "Walk-in Customer");
		r.setTotalAmount(tx.getTotalAmount());
		r.setTaxAmount(tx.getTaxAmount());
		r.setDiscountAmount(tx.getDiscountAmount());
		r.setNetAmount(tx.getNetAmount());
		r.setStatus(tx.getStatus());
		r.setCashierName(tx.getUser() != null ? tx.getUser().getFullName() : null);

		Payment payment = paymentRepository.findByTransaction(tx);
		if (payment != null) {
			r.setPaymentMethod(payment.getPaymentMethod());
		}

		List<TransactionItem> items = transactionItemRepository.findByTransactionOrderByItemId(tx);
		r.setItems(items.stream().map(this::mapToItemDto).collect(Collectors.toList()));
		return r;
	}

	private PosTransactionResponse.TransactionItemDto mapToItemDto(TransactionItem item) {
		return new PosTransactionResponse.TransactionItemDto(
				item.getProduct().getProductId(),
				item.getProduct().getProductName(),
				item.getProduct().getProductCode(),
				item.getQuantity(),
				item.getUnitPrice(),
				item.getDiscountAmount(),
				item.getLineTotal()
		);
	}

	// Search active customers by name/email/phone, limited to top 10
	public List<CustomerSummaryDto> searchCustomers(String term) {
		var page = userRepository.searchUsers(
				(term == null || term.isBlank()) ? null : term,
				"customer",
				true,
				PageRequest.of(0, 10)
		);
		return page.getContent().stream()
				.map(u -> new CustomerSummaryDto(u.getUserId(), u.getFullName(), u.getEmail(), u.getPhone()))
				.collect(Collectors.toList());
	}
}
