export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const supabase = getSupabaseAdmin()

  const { data: games, error } = await supabase
    .from('games')
    .select(`
      *,
      game_tags ( tags ( name ) ),
      game_developer_links (
        role,
        game_developers ( id, name )
      )
    `)
    .order('release_date', { ascending: false })

  if (error) throw createError({ statusCode: 500, message: error.message })

  return games.map((game: any) => ({
    ...game,
    tags: game.game_tags.map((gt: any) => gt.tags.name),
    developers: (game.game_developer_links || []).map((gdl: any) => ({
      id: gdl.game_developers.id,
      name: gdl.game_developers.name,
      role: gdl.role,
    })),
  }))
})
