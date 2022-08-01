const cdk = require('aws-cdk-lib');
const ec2 = require("aws-cdk-lib/aws-ec2");
const ecs = require("aws-cdk-lib/aws-ecs");
// we define: not defined yet
const Redis = require('./redis');
const rds = require('aws-cdk-lib/aws-rds');

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

    // create elasticCache
    this.redis = new Redis(this, "fana-redis-test", {
      vpc: this.vpc
    });

    // create postgres database
    this.postgres = new rds.DatabaseInstance(this,'fanaDB', {
      databaseName: 'fanaPostgres',
      vpc: this.vpc,
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_14_2,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.SMALL
      ),
      securityGroup: new ec2.SecurityGroup(this, `SG-${id}`, {
        vpc: this.vpc,
        securityGroupName: 'fana-postgres-SG',
        description: "Allows TCP connections to port 5432",
        allowAllOutbound: true,
      }),
      // creates an admin user of postgres with generated password
      credentials: rds.Credentials.fromGeneratedSecret('postgres'),
    });
  }
}

module.exports = SharedResources;