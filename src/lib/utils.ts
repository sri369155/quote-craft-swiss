import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function numberToWords(num: number): string {
  if (num === 0) return "Zero"
  
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"]
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
  const scales = ["", "Thousand", "Lakh", "Crore"]
  
  function convertGroup(n: number): string {
    let result = ""
    
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + " Hundred "
      n %= 100
    }
    
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + " "
      n %= 10
    } else if (n >= 10) {
      result += teens[n - 10] + " "
      return result.trim()
    }
    
    if (n > 0) {
      result += ones[n] + " "
    }
    
    return result.trim()
  }
  
  const integerPart = Math.floor(num)
  const decimalPart = Math.round((num - integerPart) * 100)
  
  let result = ""
  
  if (integerPart === 0) {
    result = "Zero"
  } else {
    const crores = Math.floor(integerPart / 10000000)
    const lakhs = Math.floor((integerPart % 10000000) / 100000)
    const thousands = Math.floor((integerPart % 100000) / 1000)
    const hundreds = integerPart % 1000
    
    if (crores > 0) {
      result += convertGroup(crores) + " Crore "
    }
    if (lakhs > 0) {
      result += convertGroup(lakhs) + " Lakh "
    }
    if (thousands > 0) {
      result += convertGroup(thousands) + " Thousand "
    }
    if (hundreds > 0) {
      result += convertGroup(hundreds)
    }
  }
  
  result = result.trim() + " Rupees"
  
  if (decimalPart > 0) {
    result += " and " + convertGroup(decimalPart) + " Paise"
  }
  
  return result + " Only"
}
