const cdk = require('aws-cdk-lib');
const rds = require('aws-cdk-lib/aws-rds');
const ec2 = require('aws-cdk-lib/aws-ec2');
const { Construct } = require('constructs');


class Postgres extends Construct {
// class Postgres extends cdk.Construct {
  constructor(scope, id, props) {
    super(scope, id);

    // vpc is passed in from shared resources
    const targetVpc = props.vpc;

    // Postgres database instance
    this.instance = new rds.DatabaseInstance(this, `${id}-database-instance`, {
      databaseName: 'fana-postgres',
      vpc: targetVpc,
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_14_2,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.SMALL
      ),
      // creates an admin user of postgres with generated password
      credentials: rds.Credentials.fromGeneratedSecret('postgres'),
      // does it need a subnet group?? 
    });

    this.subnetGroup = new rds.SubnetGroup(this, `${id}-subnet-group`, {
      description: `Subnets used for postgres ${id}`,
      vpc: targetVpc,
      // not sure if need these subnet Ids? 
      // subnetIds: targetVpc.privateSubnets.map(function (subnet) {
      //   return subnet.subnetId;
      // }),
    })

    this.securityGroup = new ec2.SecurityGroup(this, `SG-${id}`, {
      vpc: targetVpc,
      securityGroupName: 'fana-postgres-SG-CDK',
      description: `${id} SG created via CDK for postgres`,
      allowAllOutbound: true,
    });

  }
}

module.exports = Postgres;
