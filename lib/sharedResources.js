const cdk = require('@aws-cdk/core');
const ec2 = require("@aws-cdk/aws-ec2");
const ecs = require("@aws-cdk/aws-ecs");
// we define: not defined yet
const Redis = require('./redis');
const Postgres = require('./postgres')

class SharedResources extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // create VPC; default VPC comes with public subnets
    this.vpc = new ec2.Vpc(this, "fana-vpc", {
      maxAzs: 2
    });

    // create cluster and point to our VPC
    this.cluster = new ecs.Cluster(this, "fana-cluster", {
      vpc: this.vpc
    });

    // create elsticCache
    this.redis = new Redis(this, "fana-redis", {
      vpc: this.vpc
    });

    // create postgres database
    this.postgres = new Postgres(this, "fana-database", {
      vpc: this.vpc,
      
    })
  }
}

module.exports = SharedResources;