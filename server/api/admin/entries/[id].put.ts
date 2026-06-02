export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const { data: entry, error } = await supabase
    .from('entries')
    .update({
      title: body.title,
      original_title: body.original_title,
      summary: body.summary,
      cover_url: body.cover_url,
      rating: body.rating,
      status: body.status,
      review: body.review,
      play_time: body.play_time,
      play_date: body.play_date,
      developer: body.developer,
      release_date: body.release_date,
      game_type: body.game_type || 'VN',
      dev_status: body.dev_status || '已发布',
      platforms: body.platforms || [],
      languages: body.languages || [],
      links: body.links || [],
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })

  // Re-sync entry_tags: delete all, then re-insert
  await supabase.from('entry_tags').delete().eq('entry_id', id)

  if (body.tags && body.tags.length > 0) {
    for (const tagName of body.tags) {
      let { data: tag } = await supabase.from('tags').select('id').eq('name', tagName).single()
      if (!tag) {
        const { data: newTag } = await supabase.from('tags').insert({ name: tagName }).select('id').single()
        tag = newTag
      }
      if (tag) {
        await supabase.from('entry_tags').insert({ entry_id: id, tag_id: tag.id })
      }
    }
  }

  return entry
})
