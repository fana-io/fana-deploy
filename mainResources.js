const cdk = require('@aws-cdk/core');
const ec2 = require("@aws-cdk/aws-ec2");
const ecs = require("@aws-cdk/aws-ecs");
// we define: not defined yet
const Redis = require('./redis');

class MainResources extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // create VPC
    this.vpc = new ec2.Vpc(this, "fana-vpc", {
      maxAzs: 2
      // do we need to make publicSubnet explicitly here?
    });

    // create cluster and point to our VPC
    this.cluster = new ecs.Cluster(this, "fana-cluster", {
      vpc: this.vpc
    });

    // create elsticCache
    this.redis = new Redis(this, "fana-redis", {
      vpc: this.vpc
    });
  }
}

module.exports = SharedResources;