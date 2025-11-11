import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      quotation,
      customer,
      items,
      profile,
      headerImageUrl,
      footerImageUrl,
      signatureImageUrl
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Format items for the prompt
    const itemsList = items.map((item: any, index: number) => 
      `${index + 1}. ${item.description}${item.hsn_code ? ` (HSN: ${item.hsn_code})` : ''} - Qty: ${item.quantity} - Rate: ₹${item.unit_price.toLocaleString('en-IN')} - Amount: ₹${item.line_total.toLocaleString('en-IN')}`
    ).join('\n');

    // Format scope of work if present
    const scopeSection = quotation.scope_of_work ? `\n\n--- PAGE 2: SCOPE OF WORK ---\n${quotation.scope_of_work}` : '';

    // Create detailed prompt for the quotation image with consistent design template
    const prompt = `Create a professional business quotation document image${quotation.scope_of_work ? ' (2 pages)' : ''} with the following exact details:

${headerImageUrl ? '--- USE PROVIDED HEADER IMAGE AT TOP ---' : `COMPANY INFORMATION (Top of document):
Company Name: ${profile.company_name || "Company Name"}
Tagline: ${profile.company_slogan || "Your Business Tagline"}
GST Number: ${profile.gst_number || "GST Number"}`}

QUOTATION DETAILS:
Quotation Number: ${quotation.quotation_number}
Date: ${new Date(quotation.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
Valid Until: ${quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
Title: ${quotation.title}
${quotation.description ? `Description: ${quotation.description}` : ''}

CUSTOMER DETAILS:
Name: ${customer.name}
${customer.address ? `Address: ${customer.address}` : ''}
${customer.phone ? `Phone: ${customer.phone}` : ''}
${customer.email ? `Email: ${customer.email}` : ''}

ITEMS/SERVICES:
${itemsList}

FINANCIAL SUMMARY:
Subtotal: ₹${quotation.subtotal.toLocaleString('en-IN')}
GST (${quotation.tax_rate}%): ₹${quotation.tax_amount.toLocaleString('en-IN')}
Grand Total: ₹${quotation.total_amount.toLocaleString('en-IN')}
In Words: ${numberToWords(quotation.total_amount)} Only

TERMS & CONDITIONS:
- Payment within 30 days of invoice date
- 50% advance payment required to start the project
- Prices are inclusive of GST
- Delivery as per agreed timeline

${footerImageUrl ? '--- USE PROVIDED FOOTER IMAGE AT BOTTOM ---' : `COMPANY FOOTER:
${profile.company_address || "Company Address"}
Phone: ${profile.company_phone || "Phone Number"}
Email: ${profile.company_email || "Email Address"}`}

${signatureImageUrl ? '--- USE PROVIDED SIGNATURE IMAGE AT BOTTOM RIGHT ---' : `SIGNATURE BLOCK (Bottom right corner):
For ${profile.company_name || "Company Name"}
[Authorized Signatory space]`}
${scopeSection}

Design Requirements:
- CRITICAL: This design template must be CONSISTENT and IDENTICAL for all quotations
- Professional and modern business document layout with fixed structure
- Clean, well-organized sections with clear hierarchy
${headerImageUrl ? '- CRITICAL: Use ONLY the provided header image at the TOP of the document - DO NOT generate any additional company information or header text that would overlap with the image' : '- Company branding prominent at top with elegant logo space'}
- Clear itemized list table with proper alignment and borders
- Financial summary highlighted in a box and easy to read
- Terms and conditions in smaller text at bottom
${footerImageUrl ? '- CRITICAL: Use ONLY the provided footer image at the BOTTOM of the document - DO NOT generate any additional footer text or company information that would overlap with the image' : '- Company footer with contact information centered'}
${signatureImageUrl ? '- CRITICAL: Place ONLY the provided signature image at the bottom right corner - DO NOT generate any signature block text or "For [Company]" text that would overlap with the image' : '- Signature block at bottom right corner with "For ' + (profile.company_name || "Company Name") + '" and space for authorized signatory'}
- Indian Rupee (₹) currency formatting throughout
- A4 size document format (portrait orientation)
- Professional color scheme: Navy blue headers (#1e3a8a), light gray backgrounds (#f3f4f6), white content areas
- High quality, print-ready resolution (300 DPI minimum)
- Consistent fonts: Headers in bold, body text in regular weight
- Ultra high resolution
${headerImageUrl || footerImageUrl || signatureImageUrl ? '\n- CRITICAL: The provided images contain all necessary header/footer/signature information - DO NOT add any overlapping text, headings, or labels. Simply place the images at their designated positions and build the quotation content between them.' : ''}
${quotation.scope_of_work ? '\n- CRITICAL: The Scope of Work section MUST appear on a separate PAGE 2 with the same header and footer from page 1. Page 1 ends after the signature area.' : ''}`;

    console.log("Generating quotation image with Lovable AI...");

    // Build content array with prompt and images
    const contentArray: any[] = [
      {
        type: "text",
        text: prompt
      }
    ];

    // Add header image if provided
    if (headerImageUrl) {
      contentArray.push({
        type: "image_url",
        image_url: {
          url: headerImageUrl
        }
      });
    }

    // Add footer image if provided
    if (footerImageUrl) {
      contentArray.push({
        type: "image_url",
        image_url: {
          url: footerImageUrl
        }
      });
    }

    // Add signature image if provided
    if (signatureImageUrl) {
      contentArray.push({
        type: "image_url",
        image_url: {
          url: signatureImageUrl
        }
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: contentArray,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error("No image generated");
    }

    console.log("Quotation image generated successfully");

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-quotation-image:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper function to convert number to words (Indian numbering system)
function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (num === 0) return 'Zero';
  
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = Math.floor((num % 1000) / 100);
  const remainder = Math.floor(num % 100);

  let result = '';

  if (crore > 0) {
    result += convertTwoDigit(crore) + ' Crore ';
  }
  if (lakh > 0) {
    result += convertTwoDigit(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    result += convertTwoDigit(thousand) + ' Thousand ';
  }
  if (hundred > 0) {
    result += ones[hundred] + ' Hundred ';
  }
  if (remainder > 0) {
    result += convertTwoDigit(remainder);
  }

  return result.trim() + ' Rupees';

  function convertTwoDigit(n: number): string {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    const ten = Math.floor(n / 10);
    const one = n % 10;
    return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
  }
}