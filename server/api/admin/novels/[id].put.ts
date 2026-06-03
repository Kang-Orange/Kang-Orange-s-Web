export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const { data: novel, error } = await supabase
    .from('novels')
    .update({
      title: body.title,
      original_title: body.original_title,
      summary: body.summary,
      cover_url: body.cover_url,
      rating: body.rating,
      status: body.status || 'plan_to_read',
      review: body.review,
      read_time: body.read_time,
      read_date: body.read_date,
      release_date: body.release_date,
      word_count: body.word_count,
      publisher: body.publisher,
      series: body.series,
      series_order: body.series_order ?? null,
      links: body.links || [],
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })

  // Re-sync novel_tags
  await supabase.from('novel_tags').delete().eq('novel_id', id)

  if (body.tags && body.tags.length > 0) {
    for (const tagName of body.tags) {
      let { data: tag } = await supabase.from('tags').select('id').eq('name', tagName).single()
      if (!tag) {
        const { data: newTag } = await supabase.from('tags').insert({ name: tagName }).select('id').single()
        tag = newTag
      }
      if (tag) {
        await supabase.from('novel_tags').insert({ novel_id: id, tag_id: tag.id })
      }
    }
  }

  // Handle series — auto-create if name doesn't exist
  if (body.series) {
    const { data: existingSeries } = await supabase.from('novel_series').select('id').eq('name', body.series).single()
    if (!existingSeries) {
      await supabase.from('novel_series').insert({ name: body.series, sort_order: 0 })
    }
  }

  // Re-sync novel_author_links
  await supabase.from('novel_author_links').delete().eq('novel_id', id)

  if (body.authors && body.authors.length > 0) {
    for (const author of body.authors) {
      let authorId = author.id
      if (!authorId) {
        const { data: existing } = await supabase.from('novel_authors').select('id').eq('name', author.name).single()
        if (existing) {
          authorId = existing.id
        } else {
          const { data: created } = await supabase.from('novel_authors').insert({ name: author.name }).select('id').single()
          authorId = created?.id
        }
      }
      if (authorId) {
        await supabase.from('novel_author_links').insert({
          novel_id: id,
          author_id: authorId,
          role: author.role || 'writer',
        })
      }
    }
  }

  return novel
})
