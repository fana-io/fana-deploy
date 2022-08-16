#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const { FanaStack } = require('../lib/fanaStack');
const SharedResources = require('../lib/sharedResources');

const app = new cdk.App();
const shared = new SharedResources(app, 'fana-shared-resources');

new FanaStack(app, 'FanaPlatformStack', {
  cluster: shared.cluster,
  redis: shared.redis,
  postgres: shared.postgres
})