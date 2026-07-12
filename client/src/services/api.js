import api from '../api/axios';

export const postService = {
  getFeed: (page = 1) => api.get(`/posts/feed?page=${page}&limit=5`).then((r) => r.data),
  getExplore: (page = 1) => api.get(`/posts/explore?page=${page}&limit=12`).then((r) => r.data),
  getPost: (id) => api.get(`/posts/${id}`).then((r) => r.data),
  create: (formData) => api.post('/posts', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  update: (id, body) => api.put(`/posts/${id}`, body).then((r) => r.data),
  delete: (id) => api.delete(`/posts/${id}`).then((r) => r.data),
  toggleLike: (id) => api.put(`/posts/${id}/like`).then((r) => r.data),
  toggleSave: (id) => api.put(`/posts/${id}/save`).then((r) => r.data),
};

export const userService = {
  getProfile: (username) => api.get(`/users/${username}`).then((r) => r.data),
  getUserPosts: (username, page = 1) => api.get(`/users/${username}/posts?page=${page}&limit=12`).then((r) => r.data),
  getSavedPosts: () => api.get('/users/saved-posts').then((r) => r.data),
  getSuggestions: () => api.get('/users/suggestions').then((r) => r.data),
  search: (q) => api.get(`/users/search?q=${encodeURIComponent(q)}`).then((r) => r.data),
  updateProfile: (body) => api.put('/users/profile', body).then((r) => r.data),
  updateAvatar: (formData) => api.put('/users/profile-picture', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  deleteAvatar: () => api.delete('/users/profile-picture').then((r) => r.data),
  updateCover: (formData) => api.put('/users/cover-photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  deleteCover: () => api.delete('/users/cover-photo').then((r) => r.data),
  follow: (id) => api.post(`/users/${id}/follow`).then((r) => r.data),
  unfollow: (id) => api.post(`/users/${id}/unfollow`).then((r) => r.data),
  getFollowers: (username) => api.get(`/users/${username}/followers`).then((r) => r.data),
  getFollowing: (username) => api.get(`/users/${username}/following`).then((r) => r.data),
  getFollowRequests: () => api.get('/users/follow-requests').then((r) => r.data),
  acceptFollowRequest: (id) => api.post(`/users/${id}/accept-follow`).then((r) => r.data),
  rejectFollowRequest: (id) => api.post(`/users/${id}/reject-follow`).then((r) => r.data),
  getCloseFriends: () => api.get('/users/close-friends').then((r) => r.data),
  addCloseFriend: (id) => api.post(`/users/${id}/close-friends`).then((r) => r.data),
  removeCloseFriend: (id) => api.delete(`/users/${id}/close-friends`).then((r) => r.data),
};

export const commentService = {
  getComments: (postId, page = 1) => api.get(`/posts/${postId}/comments?page=${page}&limit=20`).then((r) => r.data),
  getReplies: (commentId) => api.get(`/comments/${commentId}/replies`).then((r) => r.data),
  addComment: (postId, body) => api.post(`/posts/${postId}/comments`, body).then((r) => r.data),
  deleteComment: (commentId) => api.delete(`/comments/${commentId}`).then((r) => r.data),
  toggleLike: (commentId) => api.put(`/comments/${commentId}/like`).then((r) => r.data),
  pinComment: (commentId) => api.put(`/comments/${commentId}/pin`).then((r) => r.data),
};

export const notificationService = {
  getAll: (page = 1) => api.get(`/notifications?page=${page}&limit=20`).then((r) => r.data),
  getUnreadCount: () => api.get('/notifications/unread-count').then((r) => r.data),
  markRead: (id) => api.put(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.put('/notifications/read-all').then((r) => r.data),
  deleteAll: () => api.delete('/notifications').then((r) => r.data),
};

export const storyService = {
  getFeed: () => api.get('/stories/feed').then((r) => r.data),
  create: (formData) => api.post('/stories', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  view: (id) => api.put(`/stories/${id}/view`).then((r) => r.data),
  like: (id) => api.put(`/stories/${id}/like`).then((r) => r.data),
  react: (id, emoji) => api.put(`/stories/${id}/react`, { emoji }).then((r) => r.data),
  reply: (id, text) => api.post(`/stories/${id}/reply`, { text }).then((r) => r.data),
  getViewers: (id) => api.get(`/stories/${id}/viewers`).then((r) => r.data),
  delete: (id) => api.delete(`/stories/${id}`).then((r) => r.data),
  getDrafts: () => api.get('/stories/drafts').then((r) => r.data),
  publishDraft: (id, body) => api.put(`/stories/${id}/publish`, body).then((r) => r.data),
  updateDraft: (id, body) => api.patch(`/stories/${id}/draft`, body).then((r) => r.data),
  discardDraft: (id) => api.delete(`/stories/${id}/draft`).then((r) => r.data),
  getArchive: () => api.get('/stories/archive').then((r) => r.data),
  getHighlights: (username) => api.get(username ? `/stories/highlights/${username}` : '/stories/highlights').then((r) => r.data),
  createHighlight: (body) => api.post('/stories/highlights', body).then((r) => r.data),
  updateHighlight: (id, body) => api.patch(`/stories/highlights/${id}`, body).then((r) => r.data),
  deleteHighlight: (id) => api.delete(`/stories/highlights/${id}`).then((r) => r.data),
};

export const reelService = {
  getFeed: (page = 1) => api.get(`/reels/feed?page=${page}&limit=8`).then((r) => r.data),
  getUserReels: (username, page = 1) => api.get(`/reels/user/${username}?page=${page}&limit=12`).then((r) => r.data),
  getReel: (id) => api.get(`/reels/${id}`).then((r) => r.data),
  create: (formData) => api.post('/reels', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  toggleLike: (id) => api.put(`/reels/${id}/like`).then((r) => r.data),
  toggleSave: (id) => api.put(`/reels/${id}/save`).then((r) => r.data),
  recordView: (id) => api.put(`/reels/${id}/view`).then((r) => r.data),
  delete: (id) => api.delete(`/reels/${id}`).then((r) => r.data),
};

export const messageService = {
  getConversations: () => api.get('/conversations').then((r) => r.data),
  getUnreadCount: () => api.get('/conversations/unread-count').then((r) => r.data),
  getOrCreate: (recipientId) => api.post('/conversations', { recipientId }).then((r) => r.data),
  getMessages: (conversationId, page = 1) => api.get(`/conversations/${conversationId}/messages?page=${page}&limit=50`).then((r) => r.data),
  sendMessage: (conversationId, text) => api.post(`/conversations/${conversationId}/messages`, { text }).then((r) => r.data),
  sendMediaMessage: (conversationId, formData, onUploadProgress) =>
    api.post(`/conversations/${conversationId}/messages`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }).then((r) => r.data),
  sendSharedPost: (conversationId, sharedPost) =>
    api.post(`/conversations/${conversationId}/messages`, { sharedPost }).then((r) => r.data),
};
