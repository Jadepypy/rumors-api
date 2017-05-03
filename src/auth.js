import passport from 'koa-passport';
import config from 'config';
import client, { processMeta } from 'util/client';
import FacebookStrategy from 'passport-facebook';
import TwitterStrategy from 'passport-twitter';
import GithubStrategy from 'passport-github2';
import Router from 'koa-router';
import url from 'url';

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (userId, done) => {
  try {
    const user = await client.get({
      index: 'users',
      type: 'basic',
      id: userId,
    });
    done(null, processMeta(user));
  } catch (err) {
    done(err);
  }
});

// Common verify callback for all login strategies.
//
// It tries first authenticating user with profile.id agains fieldName in DB.
// If not applicatble, search for existing users with their email.
// If still not applicable, create a user with currently given profile.
//
async function verifyProfile(profile, fieldName) {
  // Find user with such user id
  //
  const users = await client.search({
    index: 'users',
    type: 'basic',
    q: `${fieldName}:${profile.id}`,
  });

  if (users.hits.total) {
    return processMeta(users.hits.hits[0]);
  }

  const now = new Date().toISOString();
  const email = profile.emails && profile.emails[0].value;
  const avatar = profile.photos && profile.photos[0].value;

  // Find user with such email
  //
  if (email) {
    const usersWithEmail = await client.search({
      index: 'users',
      type: 'basic',
      q: `email:${email}`,
    });

    if (usersWithEmail.hits.total) {
      const id = usersWithEmail.hits.hits[0]._id;
      // Fill in fieldName with profile.id so that it does not matter if user's
      // email gets changed in the future.
      //
      const updateUserResult = await client.update({
        index: 'users',
        type: 'basic',
        id,
        body: {
          doc: {
            [fieldName]: profile.id,
            updatedAt: now,
          },
        },
        _source: true,
      });

      if (updateUserResult.result === 'updated') {
        return processMeta({ ...updateUserResult.get, _id: id });
      }

      throw new Error(updateUserResult.result);
    }
  }

  // No user in DB, create one
  //
  const createUserResult = await client.index({
    index: 'users',
    type: 'basic',
    body: {
      email,
      name: profile.displayName,
      avatarUrl: avatar,
      [fieldName]: profile.id,
      createdAt: now,
      updatedAt: now,
    },
  });

  if (createUserResult.created) {
    return processMeta(
      await client.get({
        index: 'users',
        type: 'basic',
        id: createUserResult._id,
      })
    );
  }

  throw new Error(createUserResult.result);
}

passport.use(
  new FacebookStrategy(
    {
      clientID: config.get('FACEBOOK_APP_ID'),
      clientSecret: config.get('FACEBOOK_SECRET'),
      callbackURL: config.get('FACEBOOK_CALLBACK_URL'),
      profileFields: ['id', 'displayName', 'photos', 'email'],
    },
    (token, tokenSecret, profile, done) =>
      verifyProfile(profile, 'facebookId')
        .then(user => done(null, user))
        .catch(done)
  )
);

passport.use(
  new TwitterStrategy(
    {
      consumerKey: config.get('TWITTER_CONSUMER_KEY'),
      consumerSecret: config.get('TWITTER_CONSUMER_SECRET'),
      callbackURL: config.get('TWITTER_CALLBACK_URL'),

      // https://github.com/jaredhanson/passport-twitter/issues/67#issuecomment-275288663
      userProfileURL: 'https://api.twitter.com/1.1/account/verify_credentials.json?include_email=true',
    },
    (token, tokenSecret, profile, done) =>
      verifyProfile(profile, 'twitterId')
        .then(user => done(null, user))
        .catch(done)
  )
);

passport.use(
  new GithubStrategy(
    {
      clientID: config.get('GITHUB_CLIENT_ID'),
      clientSecret: config.get('GITHUB_SECRET'),
      callbackURL: config.get('GITHUB_CALLBACK_URL'),
    },
    (token, tokenSecret, profile, done) =>
      verifyProfile(profile, 'githubId')
        .then(user => done(null, user))
        .catch(done)
  )
);

// Exports route handlers
//
export const loginRouter = Router()
  .use((ctx, next) => {
    // Memorize redirect in session
    //
    if (!ctx.query.redirect || !ctx.query.redirect.startsWith('/')) {
      const err = new Error(
        '`redirect` must present in query string and start with `/`'
      );
      err.status = 400;
      err.expose = true;
      throw err;
    }
    ctx.session.appId = ctx.query.appId || 'RUMORS_SITE';
    ctx.session.redirect = ctx.query.redirect;
    return next();
  })
  .get('/facebook', passport.authenticate('facebook', { scope: ['email'] }))
  .get('/twitter', passport.authenticate('twitter'))
  .get('/github', passport.authenticate('github', { scope: ['user:email'] }));

const handlePassportCallback = strategy => (ctx, next) =>
  passport.authenticate(strategy, (err, user) => {
    if (!err && !user) err = new Error('No such user');

    if (err) {
      err.status = 401;
      throw err;
    }

    ctx.login(user);
  })(ctx, next);

export const authRouter = Router()
  .use(async (ctx, next) => {
    // Perform redirect after login
    //
    if (!ctx.session.redirect || !ctx.session.appId) {
      const err = new Error(
        '`appId` and `redirect` must be set before. Did you forget to go to /login/*?'
      );
      err.status = 400;
      err.expose = true;
      throw err;
    }

    await next();

    let basePath = '';
    if (ctx.session.appId === 'RUMORS_SITE') {
      basePath = config.get('RUMORS_SITE_CORS_ORIGIN');
    }

    // TODO: Get basePath from DB for other client apps

    ctx.redirect(url.resolve(basePath, ctx.session.redirect));
    ctx.session.appId = undefined;
    ctx.session.redirect = undefined;
  })
  .get('/facebook', handlePassportCallback('facebook'))
  .get('/twitter', handlePassportCallback('twitter'))
  .get('/github', handlePassportCallback('github'));
