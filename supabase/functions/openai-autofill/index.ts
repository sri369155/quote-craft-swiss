
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
      const lines = bulk_description
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)

      if (lines.length > 1) {
        // Multiline bulk input — Use AI to generate items with title and description
        systemPrompt = 'You are an expert quotation assistant. Generate a professional quotation with appropriate title, description, and line items with quantities and unit prices. IMPORTANT: Do NOT include GST, tax, or any tax-related items as separate line items. Only include the actual goods/services being quoted.'
        prompt = `Based on this multi-line project description:
${lines.join('\n')}

Generate a complete quotation with:
1. A professional quotation title
2. A brief project description
3. Line items with quantities and unit prices (DO NOT include GST or tax as separate line items)

Respond in this exact JSON format:
{
  "title": "Professional quotation title",
  "scope_of_work": "• Point 1: Description\n• Point 2: Description\n• Point 3: Description",
  "items": [
    {
      "description": "item description",
      "quantity": number,
      "unit_price": number
    }
  ]
}`
      } else {
        // Single line - check for totals or use AI for smart processing
        const text = lines[0]
        const grandMatch = text.match(/(?:grand total|total cost|total amount)[^\d]*([\d,]+(?:\.\d+)?)/i)
        const unitPriceMatch = text.match(/(?:unit price|rate|cost)[^\d]*([\d,]+(?:\.\d+)?)/i)

        if (grandMatch && !unitPriceMatch) {
          // Has grand total - calculate unit price
          const total = parseFloat(grandMatch[1].replace(/,/g, ''))
          const taxRate = 18 // GST %
          const base = total / (1 + taxRate / 100)
          const unit_price = parseFloat(base.toFixed(2))
          const cleanDesc = text.replace(grandMatch[0], '').trim()

          systemPrompt = 'Generate a professional quotation title and description for this item.'
          prompt = `For this service/item: "${cleanDesc}"

Generate a professional quotation with title and description.

Respond in this exact JSON format:
{
  "title": "Professional quotation title",
  "description": "Brief project description",
  "items": [
    {
      "description": "${cleanDesc}",
      "quantity": 1,
      "unit_price": ${unit_price}
    }
  ]
}`
        } else if (unitPriceMatch && !grandMatch) {
          // Has unit price - will calculate totals in frontend
          const unit_price = parseFloat(unitPriceMatch[1].replace(/,/g, ''))
          const cleanDesc = text.replace(unitPriceMatch[0], '').trim()

          systemPrompt = 'Generate a professional quotation title and description for this item.'
          prompt = `For this service/item: "${cleanDesc}"

Generate a professional quotation with title and description.

Respond in this exact JSON format:
{
  "title": "Professional quotation title", 
  "description": "Brief project description",
  "items": [
    {
      "description": "${cleanDesc}",
      "quantity": 1,
      "unit_price": ${unit_price}
    }
  ]
}`
        } else {
          // No specific pricing info - let AI decide
          systemPrompt = 'Generate a complete quotation with professional title, description, and appropriate pricing for the service/item. IMPORTANT: Do NOT include GST, tax, or any tax-related items as separate line items.'
          prompt = `For this service/item: "${text}"

Generate a complete quotation with title, description, and appropriate pricing. Do NOT include GST or tax as separate line items.

Respond in this exact JSON format:
{
  "title": "Professional quotation title",
  "description": "Brief project description", 
  "items": [
    {
      "description": "detailed item description",
      "quantity": number,
      "unit_price": number
    }
  ]
}`
        }
      }
    } else {
      // Check if this is a scope of work generation request
      if (description.includes('Generate detailed scope of work for:')) {
        const projectTitle = description.replace('Generate detailed scope of work for:', '').trim()
        systemPrompt = 'Generate a detailed scope of work in point-wise format for the given project.'
        prompt = `For this project: "${projectTitle}"

Generate a detailed scope of work in point-wise format. Each point should be clear and specific.

Respond in this exact JSON format:
{
  "scope_of_work": "• Point 1: Description\n• Point 2: Description\n• Point 3: Description\n• Point 4: Description\n• Point 5: Description"
}`
      } else {
        // Single item description - generate title, description and pricing
        systemPrompt = 'Generate a complete quotation with professional title, description, and appropriate pricing for the single item. IMPORTANT: Do NOT include GST, tax, or any tax-related items as separate line items.'
        prompt = `For this ONE specific item: "${description}"

Generate a complete quotation with professional title, description, and appropriate pricing for this single item. Do NOT include GST or tax as separate line items.

Respond in this exact JSON format:
{
  "title": "Professional quotation title",
  "description": "Brief project description",
  "quantity": number,
  "unit_price": number,
  "reasoning": "brief explanation for pricing"
}`
      }
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
      // Return full quotation structure for bulk descriptions
      result = {
        title: suggestion.title || 'Quotation',
        scope_of_work: suggestion.scope_of_work || 'Auto-generated scope of work',
        items: suggestion.items || [
          {
            description: suggestion.description || description,
            quantity: suggestion.quantity || 1,
            unit_price: suggestion.unit_price || 0
          }
        ]
      }
    } else {
      // Return single item structure for individual item descriptions or scope of work
      result = {
        title: suggestion.title || 'Quotation',
        scope_of_work: suggestion.scope_of_work,
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
