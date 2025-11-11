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

    // Build company header section only if fields have values
    let companyHeader = '';
    if (!headerImageUrl) {
      const headerParts = [];
      if (profile.company_name) headerParts.push(`Company Name: ${profile.company_name}`);
      if (profile.company_slogan) headerParts.push(`Tagline: ${profile.company_slogan}`);
      if (profile.company_address) headerParts.push(`Address: ${profile.company_address}`);
      if (profile.company_phone) headerParts.push(`Tel: ${profile.company_phone}`);
      if (profile.company_email) headerParts.push(`Email: ${profile.company_email}`);
      if (profile.gst_number) headerParts.push(`GSTIN: ${profile.gst_number}`);
      
      companyHeader = `TOP SECTION (Header):
LEFT SIDE:
${headerParts.join('\n')}
RIGHT SIDE: Company logo`;
    } else {
      companyHeader = '--- USE PROVIDED HEADER IMAGE AT TOP ---';
    }

    // Build customer details only if fields have values
    const customerDetails = [];
    customerDetails.push(`M/S: ${customer.name}`);
    if (customer.address) customerDetails.push(`Address: ${customer.address}`);
    if (customer.phone) customerDetails.push(`PHONE: ${customer.phone}`);
    if (customer.gst_number) customerDetails.push(`GSTIN: ${customer.gst_number}`);
    if (customer.state) customerDetails.push(`Place of Supply: ${customer.state}`);

    // Build quotation details only if fields have values
    const quotationDetails = [];
    quotationDetails.push(`Quotation No: ${quotation.quotation_number}`);
    quotationDetails.push(`Quotation Date: ${new Date(quotation.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`);
    if (quotation.valid_until) quotationDetails.push(`Valid Until: ${new Date(quotation.valid_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`);
    if (customer.transport) quotationDetails.push(`Transport: ${customer.transport}`);
    if (customer.transport_id) quotationDetails.push(`Transport ID: ${customer.transport_id}`);
    if (customer.vehicle_number) quotationDetails.push(`Vehicle Number: ${customer.vehicle_number}`);

    // Create detailed prompt for the quotation image
    const prompt = `Create a professional single-page business quotation document image in A4 PORTRAIT orientation with the following EXACT DESIGN AND STRUCTURE:

=== LAYOUT STRUCTURE (MUST FOLLOW EXACTLY) ===

${companyHeader}

CENTERED TITLE: "QUOTATION" (large, bold, centered with borders)

TWO-COLUMN DETAILS SECTION (below title):
LEFT COLUMN (Customer Details):
${customerDetails.join('\n')}

RIGHT COLUMN (Quotation Details in bordered box):
${quotationDetails.join('\n')}

ITEMS TABLE (full width, bordered):
Columns: Sr. No. | Name of Product/Service | HSN/SAC | Qty | Rate | Taxable Value | IGST (% | Amount) | Total
${itemsList}
Total Row with bold text showing totals

BOTTOM SECTION:
"Total in words" (in bordered box):
${numberToWords(quotation.total_amount)} ONLY

TERMS AND CONDITIONS (below total in words):
1. Our Responsibility Ceases as soon as goods leaves our Premises.
2. Goods once sold will not taken back
3. Delivery Ex-Premises.

SIGNATURE SECTION (right side):
For ${profile.company_name || "Company Name"}

${signatureImageUrl ? '--- USE PROVIDED SIGNATURE IMAGE HERE ---' : 'Authorized Signatory'}

"This is computer generated quotation no signature required" (small text at bottom)

=== CRITICAL DESIGN REQUIREMENTS ===
- A4 PORTRAIT orientation (210mm x 297mm)
- Table-based layout with clear borders and gridlines
- Two-column format for customer and quotation details
- Professional invoice/quotation styling
- Light blue/teal header background for company section
- All text properly aligned within bordered cells
- Clean, structured, business document format
- SINGLE PAGE ONLY - compact spacing to fit everything
- Indian Rupee (₹) symbol throughout
- Professional fonts: Bold for headers, regular for content
- High quality, print-ready resolution (300 DPI)
- NO bank details section
- NO separate financial summary box
- Only include fields that have actual values
${headerImageUrl ? '- CRITICAL: Use provided header image at top - no overlapping text' : ''}
${footerImageUrl ? '- CRITICAL: Use provided footer image at bottom - no overlapping text' : ''}
${signatureImageUrl ? '- CRITICAL: Use provided signature image in signature area - no overlapping text' : ''}
- Maintain consistent structure across all quotations
- Professional business quotation document appearance`;

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