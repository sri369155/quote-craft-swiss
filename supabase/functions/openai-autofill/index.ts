
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
    
    const { description, bulk_description } = await req.json()
    console.log('Description received:', description)
    console.log('Bulk description received:', bulk_description)

    if (!description && !bulk_description) {
      return new Response(
        JSON.stringify({ error: 'Description or bulk_description is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    console.log('OpenAI API key exists:', !!openaiApiKey)
    console.log('OpenAI API key length:', openaiApiKey ? openaiApiKey.length : 0)
    
    if (!openaiApiKey) {
      console.error('OpenAI API key not configured')
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let prompt
    let systemPrompt
    
    if (bulk_description) {
      systemPrompt = 'You are an expert in business quotations and pricing for various services and products in the Indian market. Always provide realistic, competitive pricing in Indian Rupees.'
      prompt = `Based on this project/quotation description: "${bulk_description}"

Break this down into individual line items for a professional quotation with realistic values:
- Create multiple line items (typically 3-8 items)
- Include quantity, unit price in Indian Rupees, and description for each item
- Consider services, products, materials, labor, etc.

Respond only with valid JSON in this format:
{
  "quotation_data": {
    "title": "Professional quotation title",
    "description": "Brief project description",
    "items": [
      {
        "description": "Item description",
        "quantity": number,
        "unit_price": number
      }
    ]
  }
}`
    } else {
      systemPrompt = 'You provide quantity and unit price suggestions for single line items only. Do not break items into multiple components or suggest additional items.'
      prompt = `For this ONE specific item: "${description}"

Provide ONLY quantity and unit price for this exact item. Do not break it down or suggest multiple items.

Respond with only quantity and unit_price for this single item in this exact JSON format:
{
  "quantity": number,
  "unit_price": number,
  "reasoning": "brief explanation for this single item"
}`
    }

    console.log('Making request to OpenAI API')
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    })

    console.log('OpenAI API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API error:', response.status, errorText)
      console.error('Request headers:', Object.fromEntries(response.headers.entries()))
      return new Response(
        JSON.stringify({ 
          error: `OpenAI API error: ${response.status}`,
          details: errorText 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
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
    
    let result
    if (bulk_description) {
      result = suggestion.quotation_data || suggestion
    } else {
      result = {
        description,
        quantity: suggestion.quantity || 1,
        unit_price: suggestion.unit_price || 0,
        reasoning: suggestion.reasoning || 'AI suggestion'
      }
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
