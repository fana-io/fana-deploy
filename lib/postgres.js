const cdk = require('@aws-cdk/core');
const rds = require('@aws-cdk/aws-rds');
const ec2 = require('@aws-cdk/aws-ec2');

class Postgres extends cdk.Construct {
  constructor(scope, id, props) {
    super(scope, id);

    // vpc is passed in from shared resources
    const targetVpc = props.vpc;

    // Postgres database instance
    this.instance = new rds.DatabaseInstance(this, `${id}-database-instance`, {
      databaseName: 'fana-postgres',
      vpc: props.vpc,
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
  }
}

module.exports = Postgres;


// // The security group for redis nodes
// this.securityGroup = new ec2.SecurityGroup(this, `SG-${id}`, {
//   vpc: targetVpc,
//   securityGroupName: 'fana-redis-SG',
//   description: "Allows TCP connections to port 6379",
//   allowAllOutbound: true,

// });

// this.connections = new ec2.Connections({
//   securityGroups: [this.securityGroup],
//   defaultPort: new ec2.Port({
//     protocol: ec2.Protocol.TCP,
//     fromPort: 6379,
//     toPort: 6379,
//   }),
// });
