import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to format phone number
function formatPhoneNumber(number: string): string {
  // Remove all non-digit characters except +
  let cleaned = number.replace(/[^\d+]/g, '');
  
  // If it doesn't start with +, assume it's a Swedish number and add +46
  if (!cleaned.startsWith('+')) {
    // Remove leading 0 if present
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    // Add Swedish country code
    cleaned = '+46' + cleaned;
  }
  
  return cleaned;
}

// Helper function to validate phone number
function validatePhoneNumber(number: string): boolean {
  const formatted = formatPhoneNumber(number);
  // Basic validation: should start with + and have at least 10 digits
  return formatted.startsWith('+') && formatted.replace(/\D/g, '').length >= 10;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { caller, number, notifyUrl } = await req.json()
    const telnectToken = Deno.env.get('TELNECT_API_TOKEN')
    
    console.log('Original request body:', { caller, number, notifyUrl })
    console.log('Telnect token exists:', !!telnectToken)
    
    if (!telnectToken) {
      throw new Error('TELNECT_API_TOKEN not configured')
    }

    // Validate and format phone numbers
    if (!caller || !number) {
      throw new Error('Both caller and number are required')
    }

    const formattedCaller = formatPhoneNumber(caller);
    const formattedNumber = formatPhoneNumber(number);

    console.log('Formatted phone numbers:', { 
      originalCaller: caller, 
      formattedCaller,
      originalNumber: number, 
      formattedNumber 
    });

    if (!validatePhoneNumber(formattedCaller)) {
      throw new Error(`Invalid caller phone number: ${caller}`)
    }

    if (!validatePhoneNumber(formattedNumber)) {
      throw new Error(`Invalid destination phone number: ${number}`)
    }

    // Create outbound call to the destination number
    const requestBody = {
      caller: formattedCaller,
      number: formattedNumber,
      dialplan: "E164_plus",
      timeout: 30
    };

    // Add notify URL if provided
    if (notifyUrl) {
      requestBody.notify = [
        {
          url: notifyUrl
        }
      ];
    }

    console.log('Telnect API request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://bss.telnect.com/api/v1/Calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${telnectToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Telnect API error:', response.status, errorText)
      throw new Error(`Telnect API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('Telnect API response:', result)

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})