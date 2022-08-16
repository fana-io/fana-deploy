require('dotenv').config()
const cdk = require('aws-cdk-lib');
const ec2 = require("aws-cdk-lib/aws-ec2");
const ecs = require("aws-cdk-lib/aws-ecs");
const Redis = require('./redis');
const rds = require('aws-cdk-lib/aws-rds');
const { SecretValue } = require('aws-cdk-lib');

const DB_PW = process.env.DB_PW
const DB_USER = process.env.DB_USER
const DB_NAME = process.env.DB_NAME

class SharedResources extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, "fana-vpc", {
      maxAzs: 2
    });

    this.cluster = new ecs.Cluster(this, "fana-cluster", {
      vpc: this.vpc
    });

    this.redis = new Redis(this, "fana-redis", {
      vpc: this.vpc
    });

    const dbOptions = {
      databaseName: DB_NAME,
      vpc: this.vpc,
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_14_2,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.SMALL
      ),
      credentials: rds.Credentials.fromPassword(DB_USER, SecretValue.unsafePlainText(DB_PW))
    }

    this.postgres = new rds.DatabaseInstance(this,'fanaDB', dbOptions);
  }
}

module.exports = SharedResources;