const cdk = require('@aws-cdk/core');

const SharedResources = require("./sharedResources");

class FanaApp extends cdk.App {
  constructor() {
    super();

    // shared provides VPC, ECS Cluster, Redis, and Postgres
    const shared = new SharedResources(this, "fana-shared-" + SETTINGS.name);

    // Instantiate ecs cluster w/ Fargate instance here
    // pass in the redis, cluster, and postgres info to the EC2/fargate running Fana Platform

  }
}

new FanaApp().synth();