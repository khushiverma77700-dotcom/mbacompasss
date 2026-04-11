const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate URL pattern - must be from known CAT response sheet domains
    const allowedDomains = ['cdn.digialm.com', 'digialm.com', 'www.digialm.com', 'iimcat.ac.in', 'cdn3.digialm.com'];
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Invalid URL format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!allowedDomains.some(d => parsedUrl.hostname === d || parsedUrl.hostname.endsWith('.' + d))) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'URL must be from the CAT response sheet domain (digialm.com or iimcat.ac.in). Please paste the correct response sheet URL.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching response sheet from:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      console.error('Fetch failed:', response.status, response.statusText);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Could not fetch the response sheet (HTTP ${response.status}). The link may have expired or requires active login. Try Method 2: paste the HTML source code instead.` 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const html = await response.text();

    if (!html || html.length < 500) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'The fetched page appears empty or too small. The link may require authentication. Try pasting the HTML source code instead (Method 2).' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Successfully fetched HTML, length:', html.length);

    return new Response(JSON.stringify({ success: true, html }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching response sheet:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to fetch the response sheet. The server may be blocking requests. Please use Method 2: paste the HTML source code instead.' 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
