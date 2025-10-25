// AI Service for Expense Data Extraction
class AIService {
  constructor() {
    this.categoryKeywords = {
      'Vehicle KM': [
        'taxi', 'cab', 'uber', 'ola', 'vehicle', 'car', 'transport', 'auto', 'rickshaw',
        'टैक्सी', 'कैब', 'ऑटो', 'रिक्शा', 'गाड़ी', 'वाहन', 'यातायात', 'परिवहन',
        'taxi expense', 'cab expense', 'vehicle expense', 'transport expense'
      ],
      'Fuel': [
        'fuel', 'petrol', 'diesel', 'gas', 'cng', 'lpg',
        'पेट्रोल', 'डीजल', 'गैस', 'सीएनजी', 'एलपीजी', 'ईंधन',
        'fuel expense', 'petrol expense', 'petrol ka bill', 'petrol bharaya'
      ],
      'Food': [
        'food', 'lunch', 'dinner', 'breakfast', 'meal', 'restaurant', 'cafe', 'snack', 'tea', 'coffee',
        'खाना', 'लंच', 'डिनर', 'नाश्ता', 'भोजन', 'रेस्तरां', 'कैफे', 'चाय', 'कॉफी', 'स्नैक',
        'food expense', 'lunch expense', 'lunch ka bill', 'khana khaya', 'restaurant ka bill'
      ],
      'Travel': [
        'travel', 'flight', 'train', 'bus', 'hotel', 'accommodation', 'lodging', 'airfare',
        'यात्रा', 'फ्लाइट', 'ट्रेन', 'बस', 'होटल', 'आवास', 'घर', 'हवाई किराया',
        'travel expense', 'travel ka kharcha', 'travel hua', 'travel kiya'
      ],
      'Office Supplies': [
        'stationery', 'supplies', 'equipment', 'office', 'pen', 'paper', 'printer',
        'स्टेशनरी', 'सामग्री', 'उपकरण', 'कार्यालय', 'कलम', 'कागज', 'प्रिंटर',
        'stationery expense', 'office supplies', 'equipment expense'
      ],
      'Maintenance': [
        'maintenance', 'repair', 'service', 'spare', 'parts',
        'मरम्मत', 'सर्विस', 'स्पेयर', 'पार्ट्स', 'रखरखाव',
        'maintenance expense', 'repair expense', 'service expense'
      ],
      'Accommodation': [
        'hotel', 'lodging', 'accommodation', 'room', 'stay',
        'होटल', 'आवास', 'कमरा', 'रुकना', 'घर',
        'hotel expense', 'accommodation expense', 'hotel ka bill', 'room ka rent'
      ],
      'Miscellaneous': [
        'misc', 'other', 'general',
        'अन्य', 'सामान्य', 'विविध',
        'miscellaneous expense', 'other expense', 'general expense'
      ]
    };

    this.datePatterns = {
      'today': 0,
      'yesterday': -1,
      'tomorrow': 1,
      'day before yesterday': -2,
      'day after tomorrow': 2,
      'आज': 0,
      'कल': -1,
      'परसों': -2,
      'आने वाला कल': 1,
      'दिन': 0
    };

    this.amountPatterns = [
      /₹\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
      /(\d+(?:,\d+)*(?:\.\d{2})?)\s*(?:rupees?|rs?|inr)/i,
      /(\d+(?:,\d+)*(?:\.\d{2})?)\s*₹/i,
      /(\d+(?:,\d+)*(?:\.\d{2})?)\s*(?:dollars?|usd)/i,
      /(\d+(?:,\d+)*(?:\.\d{2})?)\s*(?:euros?|eur)/i,
      /(\d+(?:,\d+)*(?:\.\d{2})?)\s*(?:रुपये|रुपया|रु)/i,
      /(\d+(?:,\d+)*(?:\.\d{2})?)\s*(?:हज़ार|हजार)/i
    ];

    // Priority keywords
    this.priorityKeywords = {
      'High': ['high', 'urgent', 'important', 'critical', 'top', 'maximum', 'जरूरी', 'महत्वपूर्ण', 'उच्च', 'अति महत्वपूर्ण', 'high priority', 'urgent hai', 'jaldi hai', 'important hai'],
      'Medium': ['medium', 'normal', 'average', 'moderate', 'सामान्य', 'मध्यम', 'औसत', 'normal priority', 'normal hai'],
      'Low': ['low', 'minor', 'not urgent', 'कम', 'छोटा', 'मामूली', 'low priority', 'kam hai']
    };

    // Payment method keywords
    this.paymentMethodKeywords = {
      'Cash': ['cash', 'नकद', 'कैश', 'रोकड़', 'cash payment', 'cash se', 'cash diya', 'cash pay kiya'],
      'Card': ['card', 'credit', 'debit', 'plastic', 'कार्ड', 'क्रेडिट', 'डेबिट', 'card payment', 'card se', 'card se pay kiya'],
      'UPI': ['upi', 'digital', 'online', 'यूपीआई', 'डिजिटल', 'ऑनलाइन', 'upi payment', 'upi se', 'upi se pay kiya'],
      'Bank Transfer': ['transfer', 'neft', 'rtgs', 'bank', 'ट्रांसफर', 'नेफ्ट', 'आरटीजीएस', 'बैंक', 'bank transfer', 'transfer kiya'],
      'Cheque': ['cheque', 'check', 'चेक', 'चेकबुक', 'cheque payment', 'cheque se']
    };
  }

  // Main method to extract expense data from natural language
  async extractExpenseData(input, user, sites) {
    try {
      const lowerInput = input.toLowerCase();
      
      // Extract amount
      const amount = this.extractAmount(input);
      
      // Extract category
      const category = this.extractCategory(lowerInput);
      
      // Extract site information
      const siteInfo = this.extractSiteInfo(lowerInput, user, sites);
      
      // Extract date
      const date = this.extractDate(input);
      
      // Extract priority
      const priority = this.extractPriority(lowerInput);
      
      // Extract payment method
      const paymentMethod = this.extractPaymentMethod(lowerInput);
      
      // Extract vendor
      const vendor = this.extractVendor(input);
      
      // Extract custom title and description
      const customTitle = this.extractCustomTitle(input);
      const customDescription = this.extractCustomDescription(input);
      
      // Generate title and description
      const title = customTitle || this.generateTitle(input);
      const description = customDescription || this.generateDescription(input, amount, category, siteInfo.siteName, priority, paymentMethod);
      
      // Validate extracted data
      if (amount && siteInfo.siteName) {
        return {
          amount,
          category,
          siteName: siteInfo.siteName,
          siteId: siteInfo.siteId,
          date,
          priority,
          paymentMethod,
          vendor,
          title,
          description,
          confidence: this.calculateConfidence(input, amount, category, siteInfo.siteName, priority, paymentMethod)
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error in AI expense extraction:', error);
      return null;
    }
  }

  // Extract amount from text
  extractAmount(input) {
    for (const pattern of this.amountPatterns) {
      const match = input.match(pattern);
      if (match) {
        const amountStr = match[1] || match[2];
        const amount = parseFloat(amountStr.replace(/,/g, ''));
        if (!isNaN(amount) && amount > 0) {
          return amount;
        }
      }
    }
    return null;
  }

  // Extract category based on keywords
  extractCategory(input) {
    for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
      if (keywords.some(keyword => input.includes(keyword))) {
        return category;
      }
    }
    return null; // No default category - only extract if mentioned
  }

  // Extract site information
  extractSiteInfo(input, user, sites) {
    let siteName = null;
    let siteId = null;
    
    // First, try to find site mentioned in the input
    if (sites && sites.length > 0) {
      for (const site of sites) {
        const siteNameLower = site.name.toLowerCase();
        const siteCodeLower = site.code.toLowerCase();
        
        if (input.includes(siteNameLower) || input.includes(siteCodeLower)) {
          siteName = site.name;
          siteId = site._id;
          break;
        }
      }
    }
    
    // If no site mentioned, use user's assigned site
    if (!siteName && user?.site) {
      const userSite = user.site;
      if (typeof userSite === 'object' && userSite.name) {
        siteName = userSite.name;
        siteId = userSite._id;
      } else if (typeof userSite === 'string') {
        const foundSite = sites?.find(site => site._id === userSite);
        if (foundSite) {
          siteName = foundSite.name;
          siteId = foundSite._id;
        }
      }
    }
    
    return { siteName, siteId };
  }

  // Extract vendor from input
  extractVendor(input) {
    const lowerInput = input.toLowerCase();
    
    // Look for vendor patterns
    const vendorPatterns = [
      /vendor\s+(?:hai\s+)?([a-zA-Z0-9\s]+?)(?:\s+hai|\s+high|\s+payment|\s+method|\s+date|$)/i,
      /(?:vendor|supplier)\s+(?:is\s+)?([a-zA-Z0-9\s]+?)(?:\s+high|\s+payment|\s+method|\s+date|$)/i,
      /([a-zA-Z0-9\s]+?)\s+(?:vendor|supplier)/i,
      /with\s+([a-zA-Z0-9\s]+?)\s+as\s+the\s+vendor/i,
      /vendor\s+([a-zA-Z0-9\s]+?)(?:\s+and|\s+with|\s+payment|\s+method|$)/i,
      /([a-zA-Z0-9\s]+?)\s+as\s+vendor/i,
      /vendor\s+([a-zA-Z0-9\s]+?)(?:\s+ke\s+sath|\s+with|\s+and|$)/i,
      /([a-zA-Z0-9\s]+?)\s+vendor\s+ke\s+sath/i,
      /([a-zA-Z0-9\s]+?)\s+company\s+se/i,
      /([a-zA-Z0-9\s]+?)\s+from/i,
      /([a-zA-Z0-9\s]+?)\s+ke\s+sath/i,
      /([a-zA-Z0-9\s]+?)\s+se/i,
      /([a-zA-Z0-9\s]+?)\s+with/i,
      // Enhanced patterns for better extraction
      /([a-zA-Z0-9\s]+?)\s+(?:vendor|supplier)\s+hai/i,
      /vendor\s+([a-zA-Z0-9\s]+?)\s+hai/i,
      /([a-zA-Z0-9\s]+?)\s+ka\s+vendor/i,
      /([a-zA-Z0-9\s]+?)\s+ke\s+vendor/i,
      /([a-zA-Z0-9\s]+?)\s+se\s+kharida/i,
      /([a-zA-Z0-9\s]+?)\s+store\s+se/i,
      /([a-zA-Z0-9\s]+?)\s+shop\s+se/i,
      /([a-zA-Z0-9\s]+?)\s+service\s+center\s+se/i,
      /([a-zA-Z0-9\s]+?)\s+hotel\s+main/i,
      /([a-zA-Z0-9\s]+?)\s+restaurant\s+se/i,
      /([a-zA-Z0-9\s]+?)\s+cab\s+se/i,
      /([a-zA-Z0-9\s]+?)\s+airlines?\s+se/i
    ];
    
    for (const pattern of vendorPatterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        const vendor = match[1].trim();
        if (vendor.length > 0 && vendor.length < 50) {
          return vendor;
        }
      }
    }
    
    return null;
  }

  // Extract custom title from input
  extractCustomTitle(input) {
    const lowerInput = input.toLowerCase();
    
    // Look for title patterns
    const titlePatterns = [
      /expense\s+title\s+(?:rakho\s+)?([a-zA-Z0-9\s]+?)(?:\s+and|\s+description|\s+main|\s+dalo|$)/i,
      /title\s+(?:rakho\s+)?([a-zA-Z0-9\s]+?)(?:\s+and|\s+description|\s+main|\s+dalo|$)/i,
      /(?:title|heading)\s+(?:is\s+)?([a-zA-Z0-9\s]+?)(?:\s+and|\s+description|\s+main|\s+dalo|$)/i,
      /title\s+of\s+the\s+expense\s+is\s+([a-zA-Z0-9\s]+?)(?:\s+and|\s+with|\s+description|$)/i,
      /title\s+([a-zA-Z0-9\s]+?)(?:\s+and|\s+with|\s+description|$)/i,
      /expense\s+title\s+([a-zA-Z0-9\s]+?)(?:\s+and|\s+with|\s+description|$)/i,
      /title\s+of\s+the\s+expense\s+is\s+([a-zA-Z0-9\s]+?)(?:\s+and|\s+with|\s+description|$)/i,
      /the\s+title\s+of\s+the\s+expense\s+is\s+([a-zA-Z0-9\s]+?)(?:\s+and|\s+with|\s+description|$)/i,
      /for\s+([a-zA-Z0-9\s]+?)(?:\s+work|\s+office|\s+business|\s+travel|$)/i,
      /([a-zA-Z0-9\s]+?)\s+ke\s+liye/i,
      /([a-zA-Z0-9\s]+?)\s+expense/i
    ];
    
    for (const pattern of titlePatterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        const title = match[1].trim();
        if (title.length > 0 && title.length < 100) {
          return title;
        }
      }
    }
    
    return null;
  }

  // Extract custom description from input
  extractCustomDescription(input) {
    const lowerInput = input.toLowerCase();
    
    // Look for description patterns
    const descPatterns = [
      /description\s+(?:main\s+)?(?:dalo\s+)?([a-zA-Z0-9\s]+?)(?:\s*$)/i,
      /(?:description|details)\s+(?:is\s+)?([a-zA-Z0-9\s]+?)(?:\s*$)/i,
      /(?:main\s+)?dalo\s+([a-zA-Z0-9\s]+?)(?:\s*$)/i,
      /description\s+provided\s+is\s+([a-zA-Z0-9\s]+?)(?:\s*$)/i,
      /description\s+([a-zA-Z0-9\s]+?)(?:\s*$)/i,
      /details\s+([a-zA-Z0-9\s]+?)(?:\s*$)/i,
      /and\s+the\s+description\s+provided\s+is\s+([a-zA-Z0-9\s]+?)(?:\s*$)/i,
      /description\s+provided\s+is\s+([a-zA-Z0-9\s]+?)(?:\s*$)/i,
      /([a-zA-Z0-9\s]+?)\s+details/i,
      /([a-zA-Z0-9\s]+?)\s+information/i,
      /([a-zA-Z0-9\s]+?)\s+about/i
    ];
    
    for (const pattern of descPatterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        const description = match[1].trim();
        if (description.length > 0 && description.length < 200) {
          return description;
        }
      }
    }
    
    return null;
  }

  // Extract date from text
  extractDate(input) {
    const lowerInput = input.toLowerCase();
    
    // Check for specific date patterns first
    const datePatterns = [
      /(\d{1,2})\s*(?:jan|january|जनवरी)/i,
      /(\d{1,2})\s*(?:feb|february|फरवरी)/i,
      /(\d{1,2})\s*(?:mar|march|मार्च)/i,
      /(\d{1,2})\s*(?:apr|april|अप्रैल)/i,
      /(\d{1,2})\s*(?:may|मई)/i,
      /(\d{1,2})\s*(?:jun|june|जून)/i,
      /(\d{1,2})\s*(?:jul|july|जुलाई)/i,
      /(\d{1,2})\s*(?:aug|august|अगस्त)/i,
      /(\d{1,2})\s*(?:sep|september|सितंबर)/i,
      /(\d{1,2})\s*(?:oct|october|अक्टूबर)/i,
      /(\d{1,2})\s*(?:nov|november|नवंबर)/i,
      /(\d{1,2})\s*(?:dec|december|दिसंबर)/i,
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
      /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/
    ];
    
    for (const pattern of datePatterns) {
      const match = input.match(pattern);
      if (match) {
        if (match.length === 2) {
          // Day and month pattern (e.g., "19 august")
          const day = parseInt(match[1]);
          const month = this.getMonthFromPattern(pattern, input);
          const year = new Date().getFullYear();
          return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        } else if (match.length === 4) {
          // Full date pattern
          const [_, day, month, year] = match;
          return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        }
      }
    }
    
    // Check for relative dates
    for (const [keyword, daysOffset] of Object.entries(this.datePatterns)) {
      if (lowerInput.includes(keyword)) {
        const date = new Date();
        date.setDate(date.getDate() + daysOffset);
        return date.toISOString().split('T')[0];
      }
    }
    
    // Default to today
    return new Date().toISOString().split('T')[0];
  }

  // Extract priority from input
  extractPriority(input) {
    const lowerInput = input.toLowerCase();
    
    for (const [priority, keywords] of Object.entries(this.priorityKeywords)) {
      for (const keyword of keywords) {
        if (lowerInput.includes(keyword)) {
          return priority;
        }
      }
    }
    
    return null; // No default priority - only extract if mentioned
  }

  // Extract payment method from input
  extractPaymentMethod(input) {
    const lowerInput = input.toLowerCase();
    
    for (const [method, keywords] of Object.entries(this.paymentMethodKeywords)) {
      for (const keyword of keywords) {
        if (lowerInput.includes(keyword)) {
          return method;
        }
      }
    }
    
    return null; // No default payment method - only extract if mentioned
  }

  // Helper method to get month number from pattern
  getMonthFromPattern(pattern, input) {
    const monthMap = {
      'jan': 1, 'january': 1, 'जनवरी': 1,
      'feb': 2, 'february': 2, 'फरवरी': 2,
      'mar': 3, 'march': 3, 'मार्च': 3,
      'apr': 4, 'april': 4, 'अप्रैल': 4,
      'may': 5, 'मई': 5,
      'jun': 6, 'june': 6, 'जून': 6,
      'jul': 7, 'july': 7, 'जुलाई': 7,
      'aug': 8, 'august': 8, 'अगस्त': 8,
      'sep': 9, 'september': 9, 'सितंबर': 9,
      'oct': 10, 'october': 10, 'अक्टूबर': 10,
      'nov': 11, 'november': 11, 'नवंबर': 11,
      'dec': 12, 'december': 12, 'दिसंबर': 12
    };
    
    for (const [monthName, monthNum] of Object.entries(monthMap)) {
      if (input.toLowerCase().includes(monthName.toLowerCase())) {
        return monthNum;
      }
    }
    
    return new Date().getMonth() + 1; // Default to current month
  }

  // Generate title from input
  generateTitle(input) {
    const maxLength = 50;
    if (input.length <= maxLength) {
      return input;
    }
    return input.substring(0, maxLength) + '...';
  }

  // Generate description from input
  generateDescription(input, amount, category, siteName, priority, paymentMethod) {
    const parts = [];
    
    if (amount) {
      parts.push(`Amount: ₹${amount}`);
    }
    
    if (category && category !== 'Miscellaneous') {
      parts.push(`Category: ${category}`);
    }
    
    if (siteName) {
      parts.push(`Site: ${siteName}`);
    }
    
    if (priority && priority !== 'Medium') {
      parts.push(`Priority: ${priority}`);
    }
    
    if (paymentMethod && paymentMethod !== 'Cash') {
      parts.push(`Payment Method: ${paymentMethod}`);
    }
    
    if (parts.length > 0) {
      return `${input}\n\nExtracted Details:\n${parts.join('\n')}`;
    }
    
    return input;
  }

  // Calculate confidence score for extraction
  calculateConfidence(input, amount, category, siteName, priority, paymentMethod) {
    let confidence = 0;
    
    // Amount extraction confidence
    if (amount) confidence += 25;
    
    // Category extraction confidence
    if (category && category !== 'Miscellaneous') confidence += 20;
    
    // Site extraction confidence
    if (siteName) confidence += 20;
    
    // Priority extraction confidence
    if (priority && priority !== 'Medium') confidence += 10;
    
    // Payment method extraction confidence
    if (paymentMethod && paymentMethod !== 'Cash') confidence += 10;
    
    // Input quality confidence
    if (input.length > 10) confidence += 8;
    if (input.length > 20) confidence += 7;
    
    return Math.min(confidence, 100);
  }

  // Get suggestions based on user's previous expenses
  getSuggestions(user, sites) {
    const suggestions = [
      '₹500 fuel expense',
      '₹800 lunch expense',
      '₹1200 taxi expense',
      '₹2000 travel expense',
      '₹500 पेट्रोल खर्च',
      '₹800 लंच खर्च',
      '₹1200 टैक्सी खर्च',
      '₹2000 यात्रा खर्च',
      '₹500 travel expense hua 19 august main',
      '₹800 lunch expense with card payment',
      '₹1200 fuel expense urgent hai, cash payment karo',
      '₹2000 accommodation expense, UPI se pay kiya',
      '₹100 travel expense with Tata vendor for office work',
      '₹500 fuel expense high priority cash payment',
      '₹800 lunch expense from restaurant details about business meeting',
      '₹1200 taxi expense urgent hai, card se pay kiya',
      '₹2000 accommodation expense hotel main stay kiya',
      '₹500 travel expense Tata company se office ke liye'
    ];
    
    if (user?.site) {
      const userSite = user.site;
      const siteName = typeof userSite === 'object' ? userSite.name : 
                      sites?.find(site => site._id === userSite)?.name;
      
      if (siteName) {
        return suggestions.map(suggestion => `${suggestion} for ${siteName}`);
      }
    }
    
    return suggestions;
  }

  // Validate expense data
  validateExpenseData(data) {
    const errors = [];
    
    if (!data.amount || data.amount <= 0) {
      errors.push('Valid amount is required');
    }
    
    if (!data.siteName) {
      errors.push('Site information is required');
    }
    
    if (!data.category) {
      errors.push('Category is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Process voice input with noise reduction
  processVoiceInput(audioData) {
    // This would integrate with a more sophisticated voice processing service
    // For now, we'll use the Web Speech API
    return new Promise((resolve, reject) => {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN';
        
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          resolve(transcript);
        };
        
        recognition.onerror = (event) => {
          reject(new Error(`Speech recognition error: ${event.error}`));
        };
        
        recognition.start();
      } else {
        reject(new Error('Speech recognition not supported'));
      }
    });
  }
}

export default new AIService();
