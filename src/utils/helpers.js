export const formatParticipantName = (participant) => {
  let name = ''
  if (participant?.nickname && participant?.name) {
    name = `${participant.nickname}（${participant.name}）`;
  } else if (participant?.nickname) {
    name = participant.nickname;
  } else if (participant?.name) {
    name = participant.name;
  } else {
    name = participant?.email || '未知用户';
  }
  if (participant?.isPreRegistered) {
    name += ' (预注册)';
  }
  return name;
};

export const getParticipantNameById = (id, participantObjects) => {
  let participant = participantObjects.find(p => p.id === id);
  if (!participant) {
    participant = participantObjects.find(p => 
      p.name === id || 
      p.nickname === id || 
      p.email === id
    );
  }
  return participant ? formatParticipantName(participant) : id;
};

export const loadAllParticipants = async (profilesApi, supabase) => {
  try {
    const [profilesResult, preRegisteredResult] = await Promise.all([
      profilesApi.getAll(),
      supabase.from('pre_registered_users').select('*')
    ]);

    let allParticipants = [];
    if (!profilesResult.error && profilesResult.data) {
      allParticipants = [...profilesResult.data];
    }
    if (!preRegisteredResult.error && preRegisteredResult.data) {
      const preUsersWithFlag = preRegisteredResult.data.map(u => ({
        ...u,
        isPreRegistered: true
      }));
      allParticipants = [...allParticipants, ...preUsersWithFlag];
    }

    return {
      participantObjects: allParticipants,
      participants: allParticipants.map(p => formatParticipantName(p))
    };
  } catch (e) {
    console.error('加载用户失败:', e);
    return { participantObjects: [], participants: [] };
  }
};

export const checkIsAdmin = async (user, supabase) => {
  if (!user) return false;
  
  if (user.email === '22978@qq.com') {
    return true;
  }
  
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    return profile?.is_admin || false;
  } catch (e) {
    return false;
  }
};
