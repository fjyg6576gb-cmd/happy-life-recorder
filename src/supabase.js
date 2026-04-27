import { createClient } from '@supabase/supabase-js'

// Supabase 项目配置
const supabaseUrl = 'https://iwsfyqzpneipwptnfekg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3c2Z5cXpwbmVpcHdwdG5mZWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDU2NDAsImV4cCI6MjA5MDAyMTY0MH0.-5z-jnXe-NNPfv-1-np3pwtHnkYZS8z8KZ-kQ4xXfKc'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'happy-life-recorder'
    }
  }
})

// ==================== 吃饭记录相关 API ====================
export const mealsApi = {
  // 获取所有吃饭记录
  async getAll(userId) {
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .order('date', { ascending: false })
    return { data, error }
  },

  // 添加吃饭记录
  async add(meal, userId) {
    const insertData = {
      user_id: userId,
      location: meal.location,
      date: meal.date,
      participants: meal.participants,
      visibility: 'private'
    }
    // 添加照片字段（如果有）
    if (meal.photo_url) insertData.photo_url = meal.photo_url
    
    const { data, error } = await supabase
      .from('meals')
      .insert([insertData])
      .select()
    return { data, error }
  },

  // 更新吃饭记录
  async update(meal) {
    const updateData = {
      location: meal.location,
      date: meal.date,
      participants: meal.participants
    }
    // 更新照片字段（如果有）
    if (meal.photo_url !== undefined) updateData.photo_url = meal.photo_url
    
    const { data, error } = await supabase
      .from('meals')
      .update(updateData)
      .eq('id', meal.id)
      .select()
    return { data, error }
  },

  // 删除吃饭记录
  async delete(id) {
    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', id)
    return { error }
  }
}

// ==================== 打牌记录相关 API ====================
export const cardGamesApi = {
  // 获取所有打牌记录
  async getAll(userId) {
    const { data, error } = await supabase
      .from('card_games')
      .select('*')
      .order('date', { ascending: false })
    return { data, error }
  },

  // 添加打牌记录
  async add(game, userId) {
    const insertData = {
      user_id: userId,
      date: game.date,
      team1: game.team1,
      team2: game.team2,
      scores: game.scores,
      winner: game.winner
    }
    
    if (game.photo_url) insertData.photo_url = game.photo_url
    if (game.visibility) insertData.visibility = game.visibility
    
    const { data, error } = await supabase
      .from('card_games')
      .insert([insertData])
      .select()
    return { data, error }
  },

  // 更新打牌记录
  async update(game) {
    const updateData = {
      date: game.date,
      team1: game.team1,
      team2: game.team2,
      scores: game.scores,
      winner: game.winner
    }
    
    if (game.photo_url !== undefined) updateData.photo_url = game.photo_url
    
    const { data, error } = await supabase
      .from('card_games')
      .update(updateData)
      .eq('id', game.id)
      .select()
    return { data, error }
  },

  // 删除打牌记录
  async delete(id) {
    const { error } = await supabase
      .from('card_games')
      .delete()
      .eq('id', id)
    return { error }
  }
}

// ==================== 分组相关 API ====================
export const groupsApi = {
  // 获取所有分组
  async getAll() {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // 创建分组
  async create(groupName, userId) {
    const { data, error } = await supabase
      .from('groups')
      .insert([{
        name: groupName,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
    return { data, error }
  },

  // 更新分组名
  async update(groupId, groupName) {
    const { data, error } = await supabase
      .from('groups')
      .update({
        name: groupName,
        updated_at: new Date().toISOString()
      })
      .eq('id', groupId)
      .select()
    return { data, error }
  },

  // 删除分组
  async delete(groupId) {
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId)
    return { error }
  },

  // 获取组成员
  async getMembers(groupId) {
    // 先获取 group_members
    const { data: membersData, error: membersError } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
    
    if (membersError) {
      return { data: null, error: membersError }
    }
    
    if (!membersData || membersData.length === 0) {
      return { data: [], error: null }
    }
    
    // 获取所有用户ID
    const userIds = membersData.map(m => m.user_id)
    
    // 获取对应的 profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds)
    
    if (profilesError) {
      return { data: null, error: profilesError }
    }
    
    // 手动合并数据
    const combinedData = membersData.map(member => {
      const profile = profilesData?.find(p => p.id === member.user_id)
      return {
        ...member,
        profiles: profile
      }
    })
    
    return { data: combinedData, error: null }
  },

  // 添加组成员
  async addMember(groupId, userId) {
    const { data, error } = await supabase
      .from('group_members')
      .insert([{
        group_id: groupId,
        user_id: userId
      }])
      .select()
    return { data, error }
  },

  // 移除组成员
  async removeMember(groupId, userId) {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId)
    return { error }
  }
}

// ==================== 用户相关 API ====================
export const profilesApi = {
  // 获取所有用户
  async getAll() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // 获取当前用户信息
  async getCurrent(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return { data, error }
  }
}

// ==================== 地点相关 API ====================
export const locationsApi = {
  // 获取所有地点
  async getAll() {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('name', { ascending: true })
    return { data, error }
  },

  // 添加地点
  async add(name) {
    const { data, error } = await supabase
      .from('locations')
      .insert([{ name }])
      .select()
    return { data, error }
  },

  // 删除地点
  async delete(id) {
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id)
    return { error }
  }
}

// ==================== 存储相关 API ====================
export const storageApi = {
  // 上传照片
  async uploadPhoto(file, path = 'photos') {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `${path}/${fileName}`

    const { data, error } = await supabase.storage
      .from('photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      return { data: null, error }
    }

    // 获取公开 URL
    const { data: { publicUrl } } = supabase.storage
      .from('photos')
      .getPublicUrl(filePath)

    return { data: publicUrl, error: null }
  },

  // 删除照片
  async deletePhoto(filePath) {
    const { error } = await supabase.storage
      .from('photos')
      .remove([filePath])
    return { error }
  }
}
