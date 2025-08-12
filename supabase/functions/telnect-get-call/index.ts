import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  console.log('=== TELNECT GET CALL FUNCTION START ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    console.log('=== PARSING REQUEST BODY ===');
    const requestData = await req.json();
    console.log('Raw request data:', JSON.stringify(requestData, null, 2));
    
    const { callId } = requestData;
    console.log('=== EXTRACTED PARAMETERS ===');
    console.log('Extracted callId:', callId, '(type:', typeof callId, ')');

    console.log('=== ENVIRONMENT CHECK ===');
    const telnectToken = Deno.env.get('TELNECT_API_TOKEN');
    console.log('TELNECT_API_TOKEN exists:', !!telnectToken);

    if (!telnectToken) {
      console.error('ERROR: TELNECT_API_TOKEN not configured');
      throw new Error('TELNECT_API_TOKEN not configured');
    }

    console.log('=== PARAMETER VALIDATION ===');
    if (!callId) {
      console.error('ERROR: callId is required but missing');
      throw new Error('callId is required');
    }

    console.log('=== PREPARING API CALL ===');
    const apiUrl = `https://bss.telnect.com/api/v1/Calls/${callId}`;
    console.log('API URL:', apiUrl);
    console.log('API Method: GET');
    
    const headers = {
      'Authorization': `Bearer ${telnectToken}`,
      'Content-Type': 'application/json'
    };

    console.log('=== MAKING API CALL ===');
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers
    });

    console.log('=== API RESPONSE RECEIVED ===');
    console.log('Telnect API response status:', response.status);
    console.log('Telnect API response statusText:', response.statusText);

    if (!response.ok) {
      console.log('=== API ERROR RESPONSE ===');
      const errorText = await response.text();
      console.error('Telnect API error response body:', errorText);
      
      const errorMessage = `Telnect API error: ${response.status} ${response.statusText} - ${errorText}`;
      console.error('Final error message:', errorMessage);
      throw new Error(errorMessage);
    }

    console.log('=== SUCCESS RESPONSE ===');
    const responseText = await response.text();
    console.log('Raw response text:', responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
      console.log('Parsed response JSON:', JSON.stringify(result, null, 2));
    } catch (parseError) {
      console.error('Could not parse success response as JSON:', parseError.message);
      result = { raw_response: responseText };
    }

    console.log('=== RETURNING SUCCESS ===');
    const successResponse = JSON.stringify(result);
    console.log('Final success response:', successResponse);
    
    return new Response(successResponse, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.log('=== EXCEPTION CAUGHT ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    
    const errorResponse = {
      error: error.message,
      error_type: error.constructor.name,
      timestamp: new Date().toISOString()
    };
    
    console.log('=== RETURNING ERROR RESPONSE ===');
    console.log('Error response object:', JSON.stringify(errorResponse, null, 2));
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } finally {
    console.log('=== TELNECT GET CALL FUNCTION END ===');
  }
});
