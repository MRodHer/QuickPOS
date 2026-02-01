import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-clip-signature',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    console.log('Clip webhook received:', JSON.stringify(payload))

    // Clip webhook payload structure
    const { event, data } = payload

    // Check if this is a successful payment event
    if (event === 'payment.success' || event === 'charge.succeeded' || data?.status === 'approved' || data?.status === 'completed') {
      const paymentId = data?.id || data?.payment_request_id || data?.payment_id
      const referenceId = data?.reference || data?.external_reference || data?.metadata?.sale_id

      console.log('Payment successful:', paymentId, 'Reference:', referenceId)

      // Find the sale by the clip payment reference stored in card_reference
      const { data: sales, error: findError } = await supabaseClient
        .from('sales')
        .select('*, sale_items(*)')
        .eq('status', 'pending_payment')
        .eq('payment_method', 'clip')
        .or(`card_reference.eq.${paymentId},card_reference.ilike.%${paymentId}%`)
        .limit(1)

      if (findError) {
        console.error('Error finding sale:', findError)
        return new Response(JSON.stringify({ error: 'Error finding sale' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (!sales || sales.length === 0) {
        console.log('No pending sale found for payment:', paymentId)
        return new Response(JSON.stringify({ message: 'No pending sale found' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const sale = sales[0]
      console.log('Found sale:', sale.id, sale.ticket_number)

      // Update sale status to completed
      const { error: updateError } = await supabaseClient
        .from('sales')
        .update({
          status: 'completed',
          notes: (sale.notes || '') + ` | Pago Clip confirmado: ${paymentId}`,
        })
        .eq('id', sale.id)

      if (updateError) {
        console.error('Error updating sale:', updateError)
        return new Response(JSON.stringify({ error: 'Error updating sale' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Deduct inventory for each item
      for (const item of sale.sale_items || []) {
        if (item.product_id) {
          // Get current stock
          const { data: product } = await supabaseClient
            .from('products')
            .select('stock_quantity, track_stock')
            .eq('id', item.product_id)
            .single()

          if (product?.track_stock) {
            const newStock = (product.stock_quantity || 0) - item.quantity

            // Update product stock
            await supabaseClient
              .from('products')
              .update({ stock_quantity: newStock })
              .eq('id', item.product_id)

            // Record stock movement
            await supabaseClient.from('stock_movements').insert({
              business_id: sale.business_id,
              product_id: item.product_id,
              user_id: sale.seller_id,
              type: 'sale',
              quantity: -item.quantity,
              previous_stock: product.stock_quantity,
              new_stock: newStock,
              reference_id: sale.id,
              notes: `Venta ${sale.ticket_number} - Pago Clip`,
            })
          }
        }
      }

      // Update cash register totals
      if (sale.cash_register_id) {
        const { data: register } = await supabaseClient
          .from('cash_registers')
          .select('*')
          .eq('id', sale.cash_register_id)
          .single()

        if (register) {
          await supabaseClient
            .from('cash_registers')
            .update({
              total_sales: (register.total_sales || 0) + sale.total,
              total_terminal: (register.total_terminal || 0) + sale.total,
              sale_count: (register.sale_count || 0) + 1,
            })
            .eq('id', sale.cash_register_id)
        }
      }

      console.log('Sale completed successfully:', sale.id)

      return new Response(JSON.stringify({
        success: true,
        message: 'Payment processed',
        sale_id: sale.id,
        ticket_number: sale.ticket_number,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // For other events, just acknowledge
    return new Response(JSON.stringify({ message: 'Event received' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Webhook error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
