const cdk = require("@aws-cdk/core");
const elasticache = require("@aws-cdk/aws-elasticache");
const ec2 = require("@aws-cdk/aws-ec2");

// gets passed 
class Redis extends cdk.Construct {
  constructor(scope, id, props) {
    super(scope, id);

    // passed when instantiated at SharedResources
    const targetVpc = props.vpc;

    // Subnets for cache nodes; default (public) subnets from VPC
    const subnetGroup = new elasticache.CfnSubnetGroup(
      this, `${id}-subnet-group`, {
        description: `Subnets used for redis cache ${id}`,
        subnetIds: targetVpc.publicSubnets.map(function (subnet) {
          return subnet.subnetId;
        }),
      }
    );

    // The security group for redis nodes
    this.securityGroup = new ec2.SecurityGroup(this, `SG-${id}`, {
      vpc: targetVpc,
      securityGroupName: 'fana-redis-SG',
      description: "Allows TCP connections to port 6379",
      allowAllOutbound: true,

    });

    this.connections = new ec2.Connections({
      securityGroups: [this.securityGroup],
      defaultPort: new ec2.Port({
        protocol: ec2.Protocol.TCP,
        fromPort: 6379,
        toPort: 6379,
      }),
    });

    // Elasticache cluster resource
    this.cluster = new elasticache.CfnCacheCluster(this, `${id}-cluster`, {
      cacheNodeType: "cache.t2.micro",
      engine: "redis",
      numCacheNodes: 1,
      autoMinorVersionUpgrade: true,
      cacheSubnetGroupName: subnetGroup.ref,
      vpcSecurityGroupIds: [this.securityGroup.securityGroupId],
      clusterName: 'fana-redis',
    });
  }
}

module.exports = Redis;