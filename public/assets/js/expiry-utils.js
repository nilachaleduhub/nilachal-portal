// expiry-utils.js - Shared utility functions for checking purchase expiry

/**
 * Calculate expiry date from validity string and purchase date
 */
function calculateExpiryDate(validityStr, purchaseDateStr) {
  if (!validityStr || !purchaseDateStr) return null;
  
  try {
    const purchaseDate = new Date(purchaseDateStr);
    if (isNaN(purchaseDate.getTime())) return null;
    
    const validity = validityStr.toLowerCase().trim();
    const daysMatch = validity.match(/(\d+)\s*days?/);
    const monthsMatch = validity.match(/(\d+)\s*months?/);
    const yearsMatch = validity.match(/(\d+)\s*years?/);
    
    const expiryDate = new Date(purchaseDate);
    
    if (daysMatch) {
      const days = parseInt(daysMatch[1], 10);
      expiryDate.setDate(expiryDate.getDate() + days);
    } else if (monthsMatch) {
      const months = parseInt(monthsMatch[1], 10);
      expiryDate.setMonth(expiryDate.getMonth() + months);
    } else if (yearsMatch) {
      const years = parseInt(yearsMatch[1], 10);
      expiryDate.setFullYear(expiryDate.getFullYear() + years);
    } else {
      return null;
    }
    
    return expiryDate;
  } catch (err) {
    return null;
  }
}

/**
 * Check if a purchase is expired
 */
function isPurchaseExpired(courseValidity, purchasedAt) {
  if (!courseValidity || !purchasedAt) return false; // No validity means no expiry
  const expiryDate = calculateExpiryDate(courseValidity, purchasedAt);
  if (!expiryDate) return false; // Can't calculate expiry, assume valid
  return expiryDate < new Date();
}

/**
 * Check if user has purchased and not expired for a specific item
 * Returns { hasAccess: boolean, isExpired: boolean, purchase: object|null }
 */
function checkPurchaseAccess(itemId, itemType, categoryId = null) {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return { hasAccess: false, isExpired: false, purchase: null };
    
    const user = JSON.parse(userStr);
    const userId = user.id || user._id || user.email;
    if (!userId) return { hasAccess: false, isExpired: false, purchase: null };
    
    // Check localStorage purchases
    const userPurchases = JSON.parse(localStorage.getItem('userPurchases') || '{}');
    const userPurchaseData = userPurchases[userId];
    
    if (userPurchaseData) {
      const allPurchases = [
        ...(userPurchaseData.courses || []),
        ...(userPurchaseData.tests || [])
      ];
      
      const purchase = allPurchases.find(p => {
        const purchaseId = p.id || p.courseId || p.testId || p._id;
        const purchaseType = p.purchaseType || p.type;
        
        if (purchaseId === itemId) {
          if (itemType === 'category' && (purchaseType === 'category' || p.categoryId === itemId)) return true;
          if (itemType === 'exam' && (purchaseType === 'exam' || purchaseId === itemId)) return true;
          if (itemType === 'test' && (purchaseType === 'test' || purchaseId === itemId)) return true;
          if (itemType === 'course' && (purchaseType === 'course' || purchaseId === itemId)) return true;
        }
        
        // Also check category access
        if (itemType === 'exam' && categoryId && p.categoryId === categoryId && (purchaseType === 'category')) return true;
        if (itemType === 'test' && categoryId && p.categoryId === categoryId && (purchaseType === 'category')) return true;
        
        return false;
      });
      
      if (purchase) {
        const expired = isPurchaseExpired(purchase.courseValidity, purchase.purchasedAt);
        return { hasAccess: !expired, isExpired: expired, purchase };
      }
    }
    
    // Check server purchases (simplified - would need API call for full check)
    return { hasAccess: false, isExpired: false, purchase: null };
  } catch (err) {
    console.warn('Error checking purchase access:', err);
    return { hasAccess: false, isExpired: false, purchase: null };
  }
}




