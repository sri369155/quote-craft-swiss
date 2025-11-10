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
      companyName, 
      companySlogan, 
      gstNumber, 
      companyAddress, 
      companyPhone, 
      companyEmail 
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create detailed prompt for sample quotation with consistent design template
    const prompt = `Create a professional business quotation document image with the following exact details:

COMPANY INFORMATION (Top of document):
Company Name: ${companyName || "ABC Company"}
Tagline: ${companySlogan || "Your Trusted Partner"}
GST Number: ${gstNumber || "22AAAAA0000A1Z5"}

QUOTATION DETAILS:
Quotation Number: SAMPLE-001
Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
Valid Until: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
Title: Sample Quotation

CUSTOMER DETAILS:
Name: Sample Customer
Address: Sample Address, City, State - 000000
Phone: +91 0000000000
Email: customer@example.com

ITEMS/SERVICES:
1. Product/Service Item 1 (HSN: 998314) - Qty: 1 - Rate: ₹10,000 - Amount: ₹10,000
2. Product/Service Item 2 (HSN: 998315) - Qty: 2 - Rate: ₹5,000 - Amount: ₹10,000
3. Product/Service Item 3 - Qty: 1 - Rate: ₹8,000 - Amount: ₹8,000

FINANCIAL SUMMARY:
Subtotal: ₹28,000
GST (18%): ₹5,040
Grand Total: ₹33,040
In Words: Thirty Three Thousand Forty Rupees Only

TERMS & CONDITIONS:
- Payment within 30 days of invoice date
- 50% advance payment required to start the project
- Prices are inclusive of GST
- Delivery as per agreed timeline

COMPANY FOOTER:
${companyAddress || "123 Business Street, City 400001"}
Phone: ${companyPhone || "+91 1234567890"}
Email: ${companyEmail || "info@company.com"}

SIGNATURE BLOCK (Bottom right corner):
For ${companyName || "ABC Company"}
[Authorized Signatory space]

Design Requirements:
- CRITICAL: This design template must be CONSISTENT and IDENTICAL for all quotations
- Professional and modern business document layout with fixed structure
- Clean, well-organized sections with clear hierarchy
- Company branding prominent at top with elegant logo space
- Clear itemized list table with proper alignment and borders
- Financial summary highlighted in a box and easy to read
- Terms and conditions in smaller text at bottom
- Company footer with contact information centered
- Signature block at bottom right corner with "For ${companyName || "ABC Company"}" and space for authorized signatory
- Indian Rupee (₹) currency formatting throughout
- A4 size document format (portrait orientation)
- Professional color scheme: Navy blue headers (#1e3a8a), light gray backgrounds (#f3f4f6), white content areas
- High quality, print-ready resolution (300 DPI minimum)
- Consistent fonts: Headers in bold, body text in regular weight
- Ultra high resolution`;

    console.log("Generating sample quotation image with Lovable AI...");

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
            content: prompt,
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

    console.log("Sample quotation image generated successfully");

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-sample-quote:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});