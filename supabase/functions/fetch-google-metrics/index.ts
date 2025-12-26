// ============================================================================
// SHOREBREAK AI - Edge Function: Fetch Google Metrics
// Cette fonction récupère la note et le nombre d'avis Google Maps
// et les sauvegarde dans la base de données
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Fonction pour extraire les données de Google Maps
async function scrapeGoogleMaps(url: string): Promise<{ rating: number | null; reviewCount: number | null }> {
  try {
    // Faire une requête à la page Google Maps
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    })

    if (!response.ok) {
      console.error(`Failed to fetch Google Maps: ${response.status}`)
      return { rating: null, reviewCount: null }
    }

    const html = await response.text()

    // Extraire la note (ex: "4.7" ou "4,7")
    // Pattern: "4.7 étoiles" ou dans les métadonnées
    let rating: number | null = null
    
    // Chercher dans différents patterns
    const ratingPatterns = [
      /(\d[.,]\d)\s*étoiles/i,
      /(\d[.,]\d)\s*stars/i,
      /"ratingValue":\s*"?(\d[.,]\d)"?/i,
      /(\d[.,]\d)<\/span>\s*<span[^>]*>étoiles/i,
      /aria-label="(\d[.,]\d)\s*(étoiles|stars)/i,
    ]

    for (const pattern of ratingPatterns) {
      const match = html.match(pattern)
      if (match) {
        rating = parseFloat(match[1].replace(',', '.'))
        break
      }
    }

    // Extraire le nombre d'avis (ex: "142 avis" ou "(142)")
    let reviewCount: number | null = null
    
    const reviewPatterns = [
      /(\d[\d\s]*)\s*avis/i,
      /(\d[\d\s]*)\s*reviews/i,
      /"reviewCount":\s*"?(\d+)"?/i,
      /\((\d[\d\s]*)\)/,
    ]

    for (const pattern of reviewPatterns) {
      const match = html.match(pattern)
      if (match) {
        // Supprimer les espaces dans les grands nombres (1 234 -> 1234)
        reviewCount = parseInt(match[1].replace(/\s/g, ''), 10)
        break
      }
    }

    console.log(`Scraped: rating=${rating}, reviewCount=${reviewCount}`)
    return { rating, reviewCount }

  } catch (error) {
    console.error('Error scraping Google Maps:', error)
    return { rating: null, reviewCount: null }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Créer le client Supabase avec les credentials admin
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Récupérer tous les utilisateurs avec une URL Google Maps
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, google_maps_url')
      .not('google_maps_url', 'is', null)
      .neq('google_maps_url', '')

    if (usersError) {
      throw new Error(`Error fetching users: ${usersError.message}`)
    }

    console.log(`Found ${users?.length || 0} users with Google Maps URL`)

    const results: Array<{ userId: string; success: boolean; rating?: number; reviewCount?: number; error?: string }> = []

    // Pour chaque utilisateur, scraper les données et les sauvegarder
    for (const user of users || []) {
      try {
        console.log(`Processing user ${user.id}: ${user.google_maps_url}`)
        
        const { rating, reviewCount } = await scrapeGoogleMaps(user.google_maps_url)

        if (rating !== null || reviewCount !== null) {
          // Sauvegarder dans google_metrics_history
          const { error: insertError } = await supabase
            .from('google_metrics_history')
            .insert({
              user_id: user.id,
              google_rating: rating,
              review_count: reviewCount,
              recorded_at: new Date().toISOString(),
            })

          if (insertError) {
            console.error(`Error inserting metrics for user ${user.id}:`, insertError)
            results.push({ userId: user.id, success: false, error: insertError.message })
          } else {
            results.push({ userId: user.id, success: true, rating: rating ?? undefined, reviewCount: reviewCount ?? undefined })
          }
        } else {
          results.push({ userId: user.id, success: false, error: 'Could not extract metrics from page' })
        }

        // Attendre un peu entre chaque requête pour éviter d'être bloqué
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error)
        results.push({ userId: user.id, success: false, error: String(error) })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.length} users`,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: String(error),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
