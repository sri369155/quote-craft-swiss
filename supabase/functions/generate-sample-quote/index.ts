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

    // Create a detailed prompt for the quotation image
    const prompt = `Create a professional business quotation document image with the following details:

Company Information:
- Company Name: ${companyName || "ABC Company"}
- Slogan: ${companySlogan || "Your Trusted Partner"}
- GST Number: ${gstNumber || "22AAAAA0000A1Z5"}
- Address: ${companyAddress || "123 Business Street, City 400001"}
- Phone: ${companyPhone || "+91 1234567890"}
- Email: ${companyEmail || "info@company.com"}

Quotation Details (Sample):
- Quotation Number: QT-2024-001
- Date: ${new Date().toLocaleDateString('en-IN')}
- Valid Until: ${new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('en-IN')}

Customer: Sample Customer Name
Address: 456 Client Avenue, City 400002

Items:
1. Web Development Services - Qty: 1 - Rate: ₹50,000 - Amount: ₹50,000
2. Digital Marketing Package - Qty: 1 - Rate: ₹30,000 - Amount: ₹30,000
3. SEO Optimization - Qty: 1 - Rate: ₹20,000 - Amount: ₹20,000

Subtotal: ₹1,00,000
GST (18%): ₹18,000
Total: ₹1,18,000

Terms & Conditions:
- Payment within 30 days
- 50% advance required
- Prices are inclusive of GST

The document should be:
- Professional and modern design
- Clean layout with proper spacing
- Company branding prominent at top
- Clear itemized list
- Indian Rupee currency format
- Professional business aesthetic
- High quality and print-ready
- A4 size document format
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