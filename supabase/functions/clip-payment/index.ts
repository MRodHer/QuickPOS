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
    const { action, businessId, amount, description, paymentId } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get Clip credentials
    const { data: config, error: configError } = await supabaseClient
      .from('terminal_configs')
      .select('api_key, secret_key')
      .eq('business_id', businessId)
      .eq('provider', 'clip')
      .eq('is_active', true)
      .single()

    if (configError || !config?.api_key || !config?.secret_key) {
      console.log('Config error:', configError)
      return new Response(JSON.stringify({ error: 'Clip no configurado. Agrega API Key y Secret en Configuración.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const authString = btoa(`${config.api_key}:${config.secret_key}`)

    if (action === 'create_payment_link') {
      const payload = {
        amount: amount, // Clip v2 uses pesos directly
        currency: 'MXN',
        purchase_description: description || 'Pago QuickPOS',
        redirection_url: {
          success: 'https://quickpos.app/pago-exitoso',
          error: 'https://quickpos.app/pago-error',
          default: 'https://quickpos.app'
        }
      }

      console.log('Calling Clip API:', JSON.stringify(payload))

      const response = await fetch('https://api.payclip.com/v2/checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const responseText = await response.text()
      console.log('Clip response:', response.status, responseText)

      if (!response.ok) {
        return new Response(JSON.stringify({ error: `Error Clip: ${responseText}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const result = JSON.parse(responseText)

      return new Response(JSON.stringify({
        id: result.payment_request_id || result.id,
        url: result.payment_request_url || result.url,
        short_url: result.payment_request_url || result.url,
        status: 'pending',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'check_payment_status') {
      // First check our database for the sale status
      const { data: sale } = await supabaseClient
        .from('sales')
        .select('status')
        .eq('card_reference', paymentId)
        .eq('payment_method', 'clip')
        .single()

      if (sale?.status === 'completed') {
        return new Response(JSON.stringify({ status: 'completed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // If not completed in our DB, check Clip API
      const response = await fetch(`https://api.payclip.com/v2/checkout/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`,
        },
      })

      if (!response.ok) {
        console.log('Clip status check failed:', response.status)
        return new Response(JSON.stringify({ status: 'pending' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const result = await response.json()
      console.log('Clip status result:', JSON.stringify(result))

      // Check for paid/completed status
      const status = result.status || result.payment_status
      const isPaid = ['paid', 'approved', 'completed', 'success'].includes(status?.toLowerCase())

      if (isPaid && sale) {
        // Update the sale to completed and process inventory
        await supabaseClient
          .from('sales')
          .update({ status: 'completed' })
          .eq('card_reference', paymentId)

        // Get sale items and update inventory
        const { data: fullSale } = await supabaseClient
          .from('sales')
          .select('*, sale_items(*)')
          .eq('card_reference', paymentId)
          .single()

        if (fullSale) {
          for (const item of fullSale.sale_items || []) {
            if (item.product_id) {
              const { data: product } = await supabaseClient
                .from('products')
                .select('stock_quantity, track_stock')
                .eq('id', item.product_id)
                .single()

              if (product?.track_stock) {
                const newStock = (product.stock_quantity || 0) - item.quantity
                await supabaseClient
                  .from('products')
                  .update({ stock_quantity: newStock })
                  .eq('id', item.product_id)
              }
            }
          }

          // Update cash register
          if (fullSale.cash_register_id) {
            const { data: register } = await supabaseClient
              .from('cash_registers')
              .select('*')
              .eq('id', fullSale.cash_register_id)
              .single()

            if (register) {
              await supabaseClient
                .from('cash_registers')
                .update({
                  total_sales: (register.total_sales || 0) + fullSale.total,
                  total_terminal: (register.total_terminal || 0) + fullSale.total,
                  sale_count: (register.sale_count || 0) + 1,
                })
                .eq('id', fullSale.cash_register_id)
            }
          }
        }
      }

      return new Response(JSON.stringify({
        status: isPaid ? 'completed' : 'pending',
        clip_status: status,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Acción no válida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
