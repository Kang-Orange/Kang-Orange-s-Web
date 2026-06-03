export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const body = await readBody(event)

  const { data: game, error } = await supabase
    .from('games')
    .insert({
      title: body.title,
      original_title: body.original_title,
      summary: body.summary,
      cover_url: body.cover_url,
      rating: body.rating,
      status: body.status,
      review: body.review,
      play_time: body.play_time,
      play_date: body.play_date,
      release_date: body.release_date,
      genre: body.genre || 'VN',
      dev_status: body.dev_status || '已发布',
      platforms: body.platforms || [],
      languages: body.languages || [],
      links: body.links || [],
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })

  // Handle tags: lookup or create, then insert game_tags
  if (body.tags && body.tags.length > 0) {
    for (const tagName of body.tags) {
      let { data: tag } = await supabase.from('tags').select('id').eq('name', tagName).single()
      if (!tag) {
        const { data: newTag } = await supabase.from('tags').insert({ name: tagName }).select('id').single()
        tag = newTag
      }
      if (tag) {
        await supabase.from('game_tags').insert({ game_id: game.id, tag_id: tag.id })
      }
    }
  }

  // Handle developers — auto-create if name doesn't exist
  if (body.developers && body.developers.length > 0) {
    for (const dev of body.developers) {
      let devId = dev.id
      if (!devId) {
        const { data: existing } = await supabase.from('game_developers').select('id').eq('name', dev.name).single()
        if (existing) {
          devId = existing.id
        } else {
          const { data: created } = await supabase.from('game_developers').insert({ name: dev.name }).select('id').single()
          devId = created?.id
        }
      }
      if (devId) {
        await supabase.from('game_developer_links').insert({
          game_id: game.id,
          developer_id: devId,
          role: dev.role || '',
        })
      }
    }
  }

  return game
})
