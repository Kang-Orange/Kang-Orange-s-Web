export default defineEventHandler(async () => {
  const supabase = getSupabase()

  const { data: games, error } = await supabase
    .from('games')
    .select(`
      *,
      game_tags (
        tags ( name )
      )
    `)
    .order('release_date', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  const result = games.map((game: any) => ({
    ...game,
    tags: game.game_tags.map((gt: any) => gt.tags.name)
  }))

  return result
})
