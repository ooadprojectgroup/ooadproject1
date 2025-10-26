package com.dvpgiftcenter.service;

import com.dvpgiftcenter.dto.checkout.CheckoutRequest;
import com.dvpgiftcenter.dto.checkout.CheckoutResponse;
import com.dvpgiftcenter.entity.*;
import com.dvpgiftcenter.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class CheckoutService {
    
    @Autowired
    private TransactionRepository transactionRepository;
    
    @Autowired
    private OnlineOrderRepository onlineOrderRepository;
    
    @Autowired
    private TransactionItemRepository transactionItemRepository;
    
    @Autowired
    private CustomerAddressRepository customerAddressRepository;
    
    @Autowired
    private OnlineProductRepository onlineProductRepository;
    
    @Autowired
    private InventoryRepository inventoryRepository;
    
    @Autowired
    private StockMovementRepository stockMovementRepository;
    
    @Autowired
    private PaymentRepository paymentRepository;
    
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TaxRateService taxRateService;
    
    @Transactional
    public CheckoutResponse processCheckout(CheckoutRequest request, String username) {
        try {
            // Get customer
            User customer = userRepository.findByUsernameAndIsActiveTrue(username)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
            
            // Validate products and calculate totals
            BigDecimal totalAmount = BigDecimal.ZERO;
            for (CheckoutRequest.CheckoutItem item : request.getItems()) {
                OnlineProduct onlineProduct = onlineProductRepository.findByProductId(item.getProductId())
                    .orElseThrow(() -> new RuntimeException("Product not found: " + item.getProductId()));
                
                // Check stock availability
                Inventory inventory = onlineProduct.getProduct().getInventory();
                if (inventory == null || inventory.getCurrentStock() < item.getQuantity()) {
                    throw new RuntimeException("Insufficient stock for product: " + onlineProduct.getProduct().getProductName());
                }
                
                BigDecimal itemTotal = onlineProduct.getOnlinePrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                totalAmount = totalAmount.add(itemTotal);
            }
            
            // Calculate tax using configured rate (defaults to 0.00 if not set)
            BigDecimal taxAmount = totalAmount.multiply(taxRateService.getTaxRate())
                .setScale(2, RoundingMode.HALF_UP);
            BigDecimal netAmount = totalAmount.add(taxAmount).setScale(2, RoundingMode.HALF_UP);
            
            // Generate bill number using format: yymmdd + userId + HHmmss
            String billNumber = generateBillNumber(customer.getUserId());
            
            // Create transaction
            Transaction transaction = new Transaction(
                customer,
                customer, // For online sales, customer is also the user
                billNumber,
                totalAmount,
                netAmount,
                "sale",
                "completed",
                "online_sale"
            );
            transaction.setTaxAmount(taxAmount);
            transaction = transactionRepository.save(transaction);
            
            // Create transaction items and update inventory
            for (CheckoutRequest.CheckoutItem item : request.getItems()) {
                OnlineProduct onlineProduct = onlineProductRepository.findByProductId(item.getProductId())
                    .orElseThrow(() -> new RuntimeException("Product not found"));
                
                BigDecimal itemTotal = onlineProduct.getOnlinePrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                
                TransactionItem transactionItem = new TransactionItem(
                    transaction,
                    onlineProduct.getProduct(),
                    item.getQuantity(),
                    onlineProduct.getOnlinePrice(),
                    itemTotal
                );
                transactionItemRepository.save(transactionItem);
                
                // Get current stock before update
                Inventory inventory = onlineProduct.getProduct().getInventory();
                Integer previousStock = inventory.getCurrentStock();
                
                // Update inventory
                inventoryRepository.decreaseStock(onlineProduct.getProduct().getProductId(), item.getQuantity());
                
                // Calculate new stock after update
                Integer newStock = previousStock - item.getQuantity();
                
                // Record stock movement
                StockMovement stockMovement = new StockMovement(
                    onlineProduct.getProduct(),
                    transaction,
                    "sale",
                    -item.getQuantity(), // Negative because it's stock out
                    previousStock,
                    newStock,
                    "Online order - " + onlineProduct.getProduct().getProductName()
                );
                stockMovementRepository.save(stockMovement);
            }

            // Recompute totals from persisted items to ensure consistency
            List<TransactionItem> persistedItems = transactionItemRepository.findByTransactionTransactionId(transaction.getTransactionId());
            BigDecimal recomputedTotal = persistedItems.stream()
                .map(TransactionItem::getLineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
            BigDecimal recomputedTax = recomputedTotal.multiply(taxRateService.getTaxRate())
                .setScale(2, RoundingMode.HALF_UP);
            BigDecimal recomputedNet = recomputedTotal.add(recomputedTax).setScale(2, RoundingMode.HALF_UP);
            transaction.setTotalAmount(recomputedTotal);
            transaction.setTaxAmount(recomputedTax);
            transaction.setNetAmount(recomputedNet);
            transactionRepository.save(transaction);

            // Create customer address
            CustomerAddress shippingAddress = new CustomerAddress(
                customer,
                request.getShippingAddress().getAddressLine1(),
                request.getShippingAddress().getCity(),
                request.getShippingAddress().getPostalCode()
            );
            shippingAddress.setAddressLine2(request.getShippingAddress().getAddressLine2());
            shippingAddress = customerAddressRepository.save(shippingAddress);
            
            // Create online order
            OnlineOrder onlineOrder = new OnlineOrder(
                customer,
                transaction,
                shippingAddress,
                "pending"
            );
            onlineOrder.setShippingMethod(request.getShippingMethod());
            onlineOrder = onlineOrderRepository.save(onlineOrder);
            
            // Create payment record with reference number
            Payment payment = new Payment(
                transaction,
                request.getPaymentMethod(),
                netAmount,
                "success"
            );
            // Generate reference number: REF-{METHOD}{yyMMddHHmmss}{4digitRandom}
            String referenceNumber = generateReferenceNumber(request.getPaymentMethod());
            payment.setReferenceNumber(referenceNumber);
            paymentRepository.save(payment);
            
            // Return response
            CheckoutResponse response = new CheckoutResponse(
                onlineOrder.getOrderId(),
                transaction.getTransactionId(),
                billNumber,
                transaction.getTotalAmount(),
                transaction.getTaxAmount(),
                transaction.getNetAmount(),
                onlineOrder.getOrderStatus(),
                onlineOrder.getPlacedAt(),
                "Order placed successfully"
            );
            response.setReferenceNumber(referenceNumber);
            return response;
            
        } catch (Exception e) {
            throw new RuntimeException("Checkout failed: " + e.getMessage());
        }
    }
    
    private String generateBillNumber(Long userId) {
        LocalDateTime now = LocalDateTime.now();
        String datePart = now.format(DateTimeFormatter.ofPattern("yyMMdd"));
        String timePart = now.format(DateTimeFormatter.ofPattern("HHmmss"));
        String base = "DVP" + datePart + userId + timePart;
        // Extremely rare edge-case: same user creates two orders within the same second
        // If collision detected, append milliseconds to ensure uniqueness
        if (transactionRepository.findByBillNumber(base).isPresent()) {
            String milli = now.format(DateTimeFormatter.ofPattern("SSS"));
            String alt = base + milli;
            if (transactionRepository.findByBillNumber(alt).isPresent()) {
                // Fallback: append a short random suffix (2 chars)
                String rnd = java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 2).toUpperCase();
                return alt + rnd;
            }
            return alt;
        }
        return base;
    }
    
    private String generateReferenceNumber(String paymentMethod) {
        String methodCode = mapPaymentMethodCode(paymentMethod);
        java.util.Random rnd = new java.util.Random();
        String ts = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyMMddHHmmss"));
        for (int i = 0; i < 10; i++) { // retry up to 10 times to keep the short format
            String rand4 = String.format("%04d", rnd.nextInt(10000));
            String ref = "REF-" + methodCode + ts + rand4;
            if (!paymentRepository.existsByReferenceNumber(ref)) {
                return ref;
            }
        }
        // If still colliding (extremely unlikely), regenerate timestamp and try again once
        ts = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyMMddHHmmss"));
        for (int i = 0; i < 10; i++) {
            String rand4 = String.format("%04d", rnd.nextInt(10000));
            String ref = "REF-" + methodCode + ts + rand4;
            if (!paymentRepository.existsByReferenceNumber(ref)) {
                return ref;
            }
        }
        // Final fallback: still return short format with a random code (accept risk)
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
}