const cdk = require('aws-cdk-lib');
const ec2 = require("aws-cdk-lib/aws-ec2");
const ecs = require("aws-cdk-lib/aws-ecs");
const secretsManager = require('aws-cdk-lib/aws-secretsmanager')
const Redis = require('./redis');
const rds = require('aws-cdk-lib/aws-rds');
const { SecretValue } = require('aws-cdk-lib');

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

    // create db secret
    // const dbCredentialsSecret = new secretsManager.Secret(this, `${id}-DBCredentialsSecret`, {
    //   secretName: `dbCredentials`,
    //   generateSecretString: {
    //     secretStringTemplate: JSON.stringify({
    //       username: 'postgres',
    //     }),
    //     excludePunctuation: true,
    //     includeSpace: false,
    //     generateStringKey: 'postgres'
    //   }
    // });
    // raccess secrets object 
    // let retrievedDbSecret = secretsManager.Secret.fromSecretNameV2(this, 'db-secret-id','dbCredentials')


    // create postgres database
    this.postgres = new rds.DatabaseInstance(this,'fanaDB', {
      databaseName: 'postgres',
      vpc: this.vpc,
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_14_2,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.SMALL
      ),
      // get username and password from existing secret
      credentials: rds.Credentials.fromPassword('postgres', SecretValue.unsafePlainText('postgres'))
      // credentials: rds.Credentials.fromSecret(retrievedDbSecret),
    });

    // allow connections to postgres
    this.postgres.connections.allowDefaultPortFromAnyIpv4('Allow inbound connection on default port from all')


    
  }
}

module.exports = SharedResources;