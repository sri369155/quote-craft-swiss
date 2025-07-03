
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('OpenAI autofill function called')
    
    const { description } = await req.json()
    console.log('Description received:', description)

    if (!description) {
      return new Response(
        JSON.stringify({ error: 'Description is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    console.log('OpenAI API key exists:', !!openaiApiKey)
    
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const prompt = `Based on this item description: "${description}"

Please suggest realistic values for a quotation line item:
- Quantity (whole number, typically 1-100)
- Unit price in Indian Rupees (realistic market price)

Consider if this is a:
- Service (hours/days of work)
- Product (physical items)
- Software/Digital service
- Consulting work

Respond only with valid JSON in this format:
{
  "quantity": number,
  "unit_price": number,
  "reasoning": "brief explanation"
}`

    console.log('Making request to OpenAI API')
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in business quotations and pricing for various services and products in the Indian market. Always provide realistic, competitive pricing in Indian Rupees.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    })

    console.log('OpenAI API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API error:', errorText)
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
    }

    const openaiResult = await response.json()
    console.log('OpenAI response:', openaiResult)
    
    const content = openaiResult.choices[0]?.message?.content

    if (!content) {
      throw new Error('No response from OpenAI')
    }

    // Parse the JSON response
    let suggestion
    try {
      suggestion = JSON.parse(content)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content)
      throw new Error('Invalid JSON response from OpenAI')
    }
    
    const result = {
      description,
      quantity: suggestion.quantity || 1,
      unit_price: suggestion.unit_price || 0,
      reasoning: suggestion.reasoning || 'AI suggestion'
    }
    
    console.log('Returning result:', result)
    
    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in openai-autofill function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
