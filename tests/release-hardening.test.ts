import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { buildApp } from '../src/app';
import { hashApiKey } from '../src/shared/api-key-auth';
import { prisma } from '../src/shared/prisma';

function rawKey(label: string) {
  return `sg_live_${label}_${randomUUID().replaceAll('-', '')}`;
}

async function createTeamWithKey(label: string, status = 'active') {
  const team = await prisma.team.create({
    data: { name: `Test ${label}`, slug: `${label}-${randomUUID()}` },
  });
  const raw = rawKey(label);
  const apiKey = await prisma.apiKey.create({
    data: { teamId: team.id, name: `${label} key`, key: hashApiKey(raw), status },
  });
  return { team, raw, apiKey };
}

test('release hardening regressions', async () => {
  const app = await buildApp();

  const invalid = await app.inject({
    method: 'GET',
    url: '/providers',
    headers: { 'x-api-key': rawKey('invalid') },
  });
  assert.equal(invalid.statusCode, 401);

  const revoked = await createTeamWithKey('revoked', 'revoked');
  const revokedResponse = await app.inject({
    method: 'GET',
    url: '/providers',
    headers: { 'x-api-key': revoked.raw },
  });
  assert.equal(revokedResponse.statusCode, 401);

  const owner = await createTeamWithKey('owner');
  const other = await createTeamWithKey('other');

  const createdConfig = await app.inject({
    method: 'POST',
    url: '/provider-configs',
    headers: { 'x-api-key': owner.raw },
    payload: {
      provider: 'paystack',
      name: 'Primary payments',
      config: { secretKey: 'must-never-leak' },
    },
  });
  assert.equal(createdConfig.statusCode, 201);
  assert.equal('config' in createdConfig.json().data, false);

  const foreignConfig = await prisma.providerConfig.create({
    data: {
      teamId: other.team.id,
      provider: 'resend',
      name: 'Foreign config',
      config: { token: 'foreign-secret' },
    },
  });
  const bolaResponse = await app.inject({
    method: 'GET',
    url: `/provider-configs/${foreignConfig.id}`,
    headers: { 'x-api-key': owner.raw },
  });
  assert.equal(bolaResponse.statusCode, 404);

  const ownConfigId = createdConfig.json().data.id as string;
  const ownConfig = await app.inject({
    method: 'GET',
    url: `/provider-configs/${ownConfigId}`,
    headers: { 'x-api-key': owner.raw },
  });
  assert.equal(ownConfig.statusCode, 200);
  assert.equal('config' in ownConfig.json().data, false);

  const payment = await app.inject({
    method: 'POST',
    url: '/payments/charges',
    headers: { 'x-api-key': owner.raw },
    payload: { provider: 'paystack', amount: 1000, currency: 'NGN', email: 'test@example.com' },
  });
  assert.equal(payment.statusCode, 201);
  assert.match(payment.json().data.reference, /^SG-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

  const email = await app.inject({
    method: 'POST',
    url: '/emails/send',
    headers: { 'x-api-key': owner.raw },
    payload: { provider: 'resend', from: 'from@example.com', to: 'to@example.com', subject: 'Test', html: '<p>Test</p>' },
  });
  assert.equal(email.statusCode, 202);
  assert.match(email.json().data.messageId, /^MSG-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

  const limited = await createTeamWithKey('limited');
  for (let index = 0; index < 30; index += 1) {
    const response = await app.inject({
      method: 'GET',
      url: '/providers',
      headers: { 'x-api-key': limited.raw },
    });
    assert.equal(response.statusCode, 200, `request ${index + 1} should be allowed`);
  }
  const throttled = await app.inject({
    method: 'GET',
    url: '/providers',
    headers: { 'x-api-key': limited.raw },
  });
  assert.equal(throttled.statusCode, 429);
  assert.equal(throttled.headers['x-ratelimit-remaining'], '0');

  await app.close();
  await prisma.$disconnect();
});
