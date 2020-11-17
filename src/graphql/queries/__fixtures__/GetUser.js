export default {
  '/users/doc/test-user': {
    id: 'test-user',
    slug: 'abc123',
    name: 'test user',
    email: 'secret@secret.com',
    avatarType: 'Facebook',
    facebookId: 123456,
  },
  '/users/doc/current-user': {
    id: 'current-user',
    slug: 'def456',
    name: 'current user',
    email: 'hi@me.com',
    avatarType: 'Github',
    githubId: 654321,
  },
  '/users/doc/test-email-user': {
    id: 'test-email-user',
    slug: 'ghi789',
    name: 'test email user',
    email: 'cofacts.tw@gmail.com',
  },
  '/users/doc/another-user': {
    id: 'another-user',
    name: 'open peeps user',
    email: 'user@example.com',
    avatarType: 'OpenPeeps',
    avatarData: '{"key":"value"}',
  },
  '/articles/doc/some-doc': {
    articleReplies: [
      // replies to the same doc only count as 1 for repliedArticleCount
      { status: 'NORMAL', appId: 'WEBSITE', userId: 'current-user' },
      { status: 'NORMAL', appId: 'WEBSITE', userId: 'current-user' },
      { status: 'NORMAL', appId: 'WEBSITE', userId: 'other-user' },
    ],
  },
  '/articles/doc/another-doc': {
    articleReplies: [
      { status: 'NORMAL', appId: 'WEBSITE', userId: 'current-user' },
      { status: 'NORMAL', appId: 'WEBSITE', userId: 'other-user' },
    ],
  },
  '/articles/doc/not-this-doc': {
    articleReplies: [
      { status: 'DELETED', appId: 'WEBSITE', userId: 'current-user' },
      { status: 'NORMAL', appId: 'WEBSITE', userId: 'other-user' },
    ],
  },
  '/articlereplyfeedbacks/doc/f1': {
    userId: 'current-user',
    appId: 'app1',
    articleId: 'a1',
    replyId: 'r1',
    score: 1,
    createdAt: '2020-03-06T00:00:00.000Z',
    updatedAt: '2020-04-06T00:00:00.000Z',
  },
};
