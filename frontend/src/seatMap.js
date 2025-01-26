const seatMap = {
    seats: {
      //========================
      //      FIRST CLASS
      // Rows 1-4, 2-2 layout
      //========================
      "A1": { occupied: true, passenger: "First Class Passenger 1", class: "first", price: "$469" },
      "C1": { occupied: true, passenger: "First Class Passenger 2", class: "first", price: "$500" },
      "D1": { occupied: false, passenger: null, class: "first", price: "$469" },
      "F1": { occupied: true, passenger: "First Class Passenger 4", class: "first", price: "$500" },
  
      "A2": { occupied: true, passenger: "First Class Passenger 5", class: "first", price: "$500" },
      "C2": { occupied: true, passenger: "First Class Passenger 6", class: "first", price: "$500" },
      "D2": { occupied: true, passenger: "First Class Passenger 7", class: "first", price: "$500" },
      "F2": { occupied: true, passenger: "First Class Passenger 8", class: "first", price: "$500" },
  
      "A3": { occupied: true, passenger: "First Class Passenger 9", class: "first", price: "$500" },
      "C3": { occupied: true, passenger: "First Class Passenger 10", class: "first", price: "$500" },
      "D3": { occupied: true, passenger: "First Class Passenger 11", class: "first", price: "$500" },
      "F3": { occupied: true, passenger: "First Class Passenger 12", class: "first", price: "$500" },
  
      "A4": { occupied: true, passenger: "First Class Passenger 13", class: "first", price: "$500" },
      "C4": { occupied: true, passenger: "First Class Passenger 14", class: "first", price: "$500" },
      "D4": { occupied: true, passenger: "First Class Passenger 15", class: "first", price: "$500" },
      "F4": { occupied: false, passenger: null, class: "first", price: "$469" },
  
      //===================================================
      //    MAIN CABIN EXTRA
      // Rows 8-12, 3-3 layout (skip 5,6,7 per typical AA)
      //===================================================
      // Row 8
      "A8": { occupied: true, passenger: "MCE Passenger 1", class: "extra", price: "$70" },
      "B8": { occupied: false, passenger: null, class: "extra", price: "$70" },
      "C8": { occupied: true, passenger: "MCE Passenger 3", class: "extra", price: "$70" },
      "D8": { occupied: true, passenger: "MCE Passenger 4", class: "extra", price: "$70" },
      "E8": { occupied: true, passenger: "MCE Passenger 5", class: "extra", price: "$70" },
      "F8": { occupied: true, passenger: "MCE Passenger 6", class: "extra", price: "$70" },
  
      // Row 9
      "A9": { occupied: true, passenger: "MCE Passenger 7", class: "extra", price: "$70" },
      "B9": { occupied: true, passenger: "MCE Passenger 8", class: "extra", price: "$70" },
      "C9": { occupied: false, passenger: null, class: "extra", price: "$70" },
      "D9": { occupied: true, passenger: "MCE Passenger 10", class: "extra", price: "$70" },
      "E9": { occupied: true, passenger: "MCE Passenger 11", class: "extra", price: "$70" },
      "F9": { occupied: true, passenger: "MCE Passenger 12", class: "extra", price: "$70" },
  
      // Row 10
      "A10": { occupied: true, passenger: "MCE Passenger 13", class: "extra", price: "$70" },
      "B10": { occupied: true, passenger: "MCE Passenger 14", class: "extra", price: "$70" },
      "C10": { occupied: true, passenger: "MCE Passenger 15", class: "extra", price: "$70" },
      "D10": { occupied: false, passenger: null, class: "extra", price: "$70" },
      "E10": { occupied: true, passenger: "MCE Passenger 17", class: "extra", price: "$70" },
      "F10": { occupied: false, passenger: null, class: "extra", price: "$70" },
  
      // Row 11
      "A11": { occupied: true, passenger: "MCE Passenger 19", class: "extra", price: "$70" },
      "B11": { occupied: false, passenger: null, class: "extra", price: "$70" },
      "C11": { occupied: true, passenger: "MCE Passenger 21", class: "extra", price: "$70" },
      "D11": { occupied: false, passenger: null, class: "extra", price: "$70" },
      "E11": { occupied: true, passenger: "MCE Passenger 23", class: "extra", price: "$70" },
      "F11": { occupied: true, passenger: "MCE Passenger 24", class: "extra", price: "$70" },
  
      // Row 12
      "A12": { occupied: true, passenger: "Mr. Khan", class: "extra", price: "" },
      "B12": { occupied: true, passenger: "MCE Passenger 26", class: "extra", price: "$70" },
      "C12": { occupied: true, passenger: "MCE Passenger 27", class: "extra", price: "$70" },
      "D12": { occupied: true, passenger: "MCE Passenger 28", class: "extra", price: "$70" },
      "E12": { occupied: true, passenger: "MCE Passenger 29", class: "extra", price: "$70" },
      "F12": { occupied: true, passenger: "MCE Passenger 30", class: "extra", price: "$70" },
  
      //====================================
      //      MAIN CABIN (ECONOMY)
      // Rows 13-30, 3-3 layout
      //====================================
      // We'll list these by row; each row has seats A-F
  
      // Row 13
      "A13": { occupied: true, passenger: "Economy Passenger 1", class: "economy", price: "$0" },
      "B13": { occupied: true, passenger: null, class: "economy", price: "$0" },
      "C13": { occupied: true, passenger: "Economy Passenger 3", class: "economy", price: "$0" },
      "D13": { occupied: true, passenger: "Economy Passenger 4", class: "economy", price: "$0" },
      "E13": { occupied: true, passenger: "Economy Passenger 5", class: "economy", price: "$0" },
      "F13": { occupied: true, passenger: "Economy Passenger 6", class: "economy", price: "$0" },
  
      // Row 14
      "A14": { occupied: true, passenger: "Economy Passenger 7", class: "economy", price: "$0" },
      "B14": { occupied: true, passenger: "Economy Passenger 8", class: "economy", price: "$0" },
      "C14": { occupied: true, passenger: "Economy Passenger 9", class: "economy", price: "$0" },
      "D14": { occupied: true, passenger: "Economy Passenger 10", class: "economy", price: "$0" },
      "E14": { occupied: false, passenger: null, class: "economy", price: "" },
      "F14": { occupied: true, passenger: "Economy Passenger 12", class: "economy", price: "$0" },
  
      // Row 15
      "A15": { occupied: true, passenger: "Economy Passenger 13", class: "economy", price: "$0" },
      "B15": { occupied: true, passenger: "Economy Passenger 14", class: "economy", price: "$0" },
      "C15": { occupied: false, passenger: null, class: "economy", price: "" },
      "D15": { occupied: true, passenger: "Economy Passenger 16", class: "economy", price: "$0" },
      "E15": { occupied: true, passenger: "Economy Passenger 17", class: "economy", price: "$0" },
      "F15": { occupied: true, passenger: "Economy Passenger 18", class: "economy", price: "$0" },
  
      // Row 16
      "A16": { occupied: true, passenger: "MCE Passenger 31", class: "extra", price: "$70" },
      "B16": { occupied: false, passenger: null, class: "extra", price: "" },
      "C16": { occupied: true, passenger: "Economy Passenger 21", class: "economy", price: "$0" },
      "D16": { occupied: true, passenger: "Economy Passenger 22", class: "economy", price: "$0" },
      "E16": { occupied: true, passenger: "Economy Passenger 23", class: "economy", price: "$0" },
      "F16": { occupied: true, passenger: "Economy Passenger 24", class: "economy", price: "$0" },
  
      // Row 17
      "A17": { occupied: true, passenger: "Economy Passenger 25", class: "economy", price: "$0" },
      "B17": { occupied: true, passenger: "Economy Passenger 26", class: "economy", price: "$0" },
      "C17": { occupied: true, passenger: "Economy Passenger 27", class: "economy", price: "$0" },
      "D17": { occupied: true, passenger: "Economy Passenger 28", class: "economy", price: "$0" },
      "E17": { occupied: true, passenger: "Economy Passenger 29", class: "economy", price: "$0" },
      "F17": { occupied: false, passenger: null, class: "economy", price: "" },
  
      // Row 18
      "A18": { occupied: true, passenger: "Economy Passenger 31", class: "economy", price: "$0" },
      "B18": { occupied: true, passenger: "Economy Passenger 32", class: "economy", price: "$0" },
      "C18": { occupied: true, passenger: "Economy Passenger 33", class: "economy", price: "$0" },
      "D18": { occupied: false, passenger: null, class: "economy", price: "" },
      "E18": { occupied: true, passenger: "Economy Passenger 35", class: "economy", price: "$0" },
      "F18": { occupied: false, passenger: null, class: "economy", price: "" },
  
      // Row 19
      "A19": { occupied: true, passenger: "Economy Passenger 37", class: "economy", price: "$0" },
      "B19": { occupied: false, passenger: null, class: "economy", price: "" },
      "C19": { occupied: true, passenger: "Economy Passenger 39", class: "economy", price: "$0" },
      "D19": { occupied: true, passenger: "Economy Passenger 40", class: "economy", price: "$0" },
      "E19": { occupied: true, passenger: "Economy Passenger 41", class: "economy", price: "$0" },
      "F19": { occupied: true, passenger: "Economy Passenger 42", class: "economy", price: "$0" },
  
      // Row 20
      "A20": { occupied: true, passenger: "Economy Passenger 43", class: "economy", price: "$0" },
      "B20": { occupied: true, passenger: "Economy Passenger 44", class: "economy", price: "$0" },
      "C20": { occupied: true, passenger: "Economy Passenger 45", class: "economy", price: "$0" },
      "D20": { occupied: true, passenger: "Economy Passenger 46", class: "economy", price: "$0" },
      "E20": { occupied: false, passenger: null, class: "economy", price: "" },
      "F20": { occupied: true, passenger: "Economy Passenger 48", class: "economy", price: "$0" },
  
      // Row 21
      "A21": { occupied: true, passenger: "Economy Passenger 49", class: "economy", price: "$0" },
      "B21": { occupied: true, passenger: "Economy Passenger 50", class: "economy", price: "$0" },
      "C21": { occupied: true, passenger: "Economy Passenger 51", class: "economy", price: "$0" },
      "D21": { occupied: true, passenger: "Economy Passenger 52", class: "economy", price: "$0" },
      "E21": { occupied: true, passenger: "Economy Passenger 53", class: "economy", price: "$0" },
      "F21": { occupied: true, passenger: "Economy Passenger 54", class: "economy", price: "$0" },
  
      // Row 22
      "A22": { occupied: true, passenger: "Economy Passenger 55", class: "economy", price: "$0" },
      "B22": { occupied: true, passenger: "Economy Passenger 56", class: "economy", price: "$0" },
      "C22": { occupied: true, passenger: "Economy Passenger 57", class: "economy", price: "$0" },
      "D22": { occupied: false, passenger: null, class: "economy", price: "" },
      "E22": { occupied: true, passenger: "Economy Passenger 59", class: "economy", price: "$0" },
      "F22": { occupied: true, passenger: "Economy Passenger 60", class: "economy", price: "$0" },
  
      // Row 23
      "A23": { occupied: true, passenger: "Economy Passenger 61", class: "economy", price: "$0" },
      "B23": { occupied: true, passenger: "Economy Passenger 62", class: "economy", price: "$0" },
      "C23": { occupied: true, passenger: "Economy Passenger 63", class: "economy", price: "$0" },
      "D23": { occupied: true, passenger: "Economy Passenger 64", class: "economy", price: "$0" },
      "E23": { occupied: true, passenger: "Economy Passenger 65", class: "economy", price: "$0" },
      "F23": { occupied: true, passenger: "Economy Passenger 66", class: "economy", price: "$0" },
  
      // Row 24
      "A24": { occupied: true, passenger: "Economy Passenger 67", class: "economy", price: "$0" },
      "B24": { occupied: true, passenger: "Economy Passenger 68", class: "economy", price: "$0" },
      "C24": { occupied: true, passenger: "Economy Passenger 69", class: "economy", price: "$0" },
      "D24": { occupied: true, passenger: "Economy Passenger 70", class: "economy", price: "$0" },
      "E24": { occupied: false, passenger: null, class: "economy", price: "" },
      "F24": { occupied: true, passenger: "Economy Passenger 72", class: "economy", price: "$0" },
  
      // Row 25
      "A25": { occupied: true, passenger: "Economy Passenger 73", class: "economy", price: "$0" },
      "B25": { occupied: true, passenger: "Economy Passenger 74", class: "economy", price: "$0" },
      "C25": { occupied: true, passenger: "Economy Passenger 75", class: "economy", price: "$0" },
      "D25": { occupied: true, passenger: "Economy Passenger 76", class: "economy", price: "$0" },
      "E25": { occupied: true, passenger: "Economy Passenger 77", class: "economy", price: "$0" },
      "F25": { occupied: true, passenger: "Economy Passenger 78", class: "economy", price: "$0" },
  
      // Row 26
      "A26": { occupied: true, passenger: "Economy Passenger 79", class: "economy", price: "$0" },
      "B26": { occupied: true, passenger: "Economy Passenger 80", class: "economy", price: "$0" },
      "C26": { occupied: true, passenger: "Economy Passenger 81", class: "economy", price: "$0" },
      "D26": { occupied: true, passenger: "Economy Passenger 82", class: "economy", price: "$0" },
      "E26": { occupied: false, passenger: null, class: "economy", price: "" },
      "F26": { occupied: true, passenger: "Economy Passenger 84", class: "economy", price: "$0" },
  
      // Row 27
      "A27": { occupied: true, passenger: "Economy Passenger 85", class: "economy", price: "$0" },
      "B27": { occupied: true, passenger: "Economy Passenger 86", class: "economy", price: "$0" },
      "C27": { occupied: true, passenger: "Economy Passenger 87", class: "economy", price: "$0" },
      "D27": { occupied: true, passenger: "Economy Passenger 88", class: "economy", price: "$0" },
      "E27": { occupied: true, passenger: "Economy Passenger 89", class: "economy", price: "$0" },
      "F27": { occupied: true, passenger: "Economy Passenger 90", class: "economy", price: "$0" },
  
      // Row 28
      "A28": { occupied: true, passenger: "Economy Passenger 91", class: "economy", price: "$0" },
      "B28": { occupied: true, passenger: "Economy Passenger 92", class: "economy", price: "$0" },
      "C28": { occupied: false, passenger: null, class: "economy", price: "" },
      "D28": { occupied: true, passenger: "Economy Passenger 94", class: "economy", price: "$0" },
      "E28": { occupied: false, passenger: "Economy Passenger 95", class: "economy", price: "" },
      "F28": { occupied: true, passenger: "Economy Passenger 96", class: "economy", price: "$0" },
  
      // Row 29
      "A29": { occupied: true, passenger: "Economy Passenger 97", class: "economy", price: "$0" },
      "B29": { occupied: true, passenger: "Economy Passenger 98", class: "economy", price: "$0" },
      "C29": { occupied: true, passenger: "Economy Passenger 99", class: "economy", price: "$0" },
      "D29": { occupied: true, passenger: "Economy Passenger 100", class: "economy", price: "$0" },
      "E29": { occupied: true, passenger: "Economy Passenger 101", class: "economy", price: "$0" },
      "F29": { occupied: true, passenger: "Economy Passenger 102", class: "economy", price: "$0" },
  
      // Row 30
      "A30": { occupied: true, passenger: "Economy Passenger 103", class: "economy", price: "$0" },
      "B30": { occupied: true, passenger: "Economy Passenger 104", class: "economy", price: "$0" },
      "C30": { occupied: true, passenger: "Economy Passenger 105", class: "economy", price: "$0" },
      "D30": { occupied: true, passenger: "Economy Passenger 106", class: "economy", price: "$0" },
      "E30": { occupied: true, passenger: "Economy Passenger 107", class: "economy", price: "$0" },
      "F30": { occupied: false, passenger: null, class: "economy", price: "" },
      "A32": { occupied: false, passenger: null, class: "economy", price: "" },
      "D33": { occupied: false, passenger: null, class: "economy", price: "" }
    }
  };
  
  export { seatMap };
  