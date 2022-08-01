require('dotenv').config()
const ecs = require("aws-cdk-lib/aws-ecs");
const ecs_patterns = require("aws-cdk-lib/aws-ecs-patterns");
const elbv2 = require('aws-cdk-lib/aws-elasticloadbalancingv2');
const { Stack } = require('aws-cdk-lib'); // root construct representing a single CloudFormation stack
const ec2 = require('aws-cdk-lib/aws-ec2');

class FanaStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // task definitions
    this.taskDefinition = new ecs.FargateTaskDefinition(this, 'fanaServiceTaskDefinition', {
      memoryLimitMiB: 3072,
      cpu: 1024
    });

    this.addManagerContainerToTask()
    this.addBearerContainerToTask()
    
    this.securityGroup = this.createSecurityGroup()

    // service without LB
    new ecs.FargateService(this, 'fana-service', {
      cluster: props.cluster,
      taskDefinition: this.taskDefinition,
      securityGroups: [this.securityGroup]
    });

    // service with LB

    new ecs_patterns.ApplicationMultipleTargetGroupsFargateService(
      this,
      "fana-service",
      {
        cluster: props.cluster,
        memoryLimitMiB: 3072,
        cpu: 1024,
        taskDefinition: fanaServiceTaskDefinition,
        desiredCount: 1,
        publicLoadBalancer: true,
        serviceName: "fanaService",
        targetGroups: [
          {
            listener:
            containerPort: fanaManagerContainer.containerPort,
            pathPattern: '/',
            priority: 10,

          },
          {
            containerPort: fanaBearerContainer.containerPort,
            pathPattern: '/connect*',
            priority: 11,
          },
          {
            listener: 'streamGroup',
            containerPort: fanaBearerContainer.containerPort,
            pathPattern: '/stream*',
            priority: 12,
          },
        ],
      }
    );
    // // allow cluster to communicate with the elasticache cluster
    // loadBalancedFanaService.service.connections.allowToDefaultPort(props.redis);
    
    // add TLS listener to load balancer
    // loadBalancedFanaService.loadBalancer.addListener("fana-service-listener", {
    //   port: 80,
    //   defaultTargetGroups: [fanaManagerTargetGroup],
    //   // certificateArns: [""], what is this?
    // });
    // add target groups
      // const fanaManagerTargetGroup = new elbv2.ApplicationTargetGroup(this, 'fana-manager-target-group', {
      //   targetType: elbv2.TargetType.IP,
      //   port: fanaManagerContainer.containerPort,
      //   vpc: this.vpc
      // })
      // const fanaManagerTargetGroup = new elbv2.CfnTargetGroup(this, 'fana-manager-target-group', {
      //   healthCheckEnabled: false,
      //   healthCheckIntervalSeconds: 123,
      //   healthCheckPath: '/',
      //   healthCheckPort: 'Traffic port',
      //   healthCheckProtocol: 'HTTP',
      //   healthCheckTimeoutSeconds: 5,
      //   healthyThresholdCount: 5,
      //   ipAddressType: 'ipv4',
      //   name: 'fanaManagerTargetGroup',
      //   port: 80,
      //   protocol: 'HTTP',
      //   protocolVersion: 'HTTP1',
      //   targets: [{
      //     id: fanaManagerContainer.id,
      //     availabilityZone: fanaManagerContainer.availabilityZone,
      //     port: fanaManagerContainer.containerPort,
      //   }],
      //   targetType: 'INSTANCE',
      //   unhealthyThresholdCount: 2,
      //   vpcId: this.vpc.id,
      // });


    //   // fanaBearerTargetGroup
    
    // // add listner rule to listener
    // const applicationListenerRule = new elbv2.ApplicationListenerRule(this, 'MyApplicationListenerRule', {
    //   listener: loadBalancedFanaService.listener,
    //   priority: 123, // not sure; rule with lowest priority is used for ever request; must be unique
    //   conditions: [elbv2.listenerCondition.pathPatterns(['/connect*', '/stream*'])],
    //   targetGroups: [fanaBearerTargetGroup],
    // });

    // what are these outputs?
    // new cdk.CfnOutput(this, "redisEndpoint", {
    //   value: props.redis.cluster.attrRedisEndpointAddress,
    // });

    // new cdk.CfnOutput(this, "redisPort", {
    //   value: props.redis.cluster.attrRedisEndpointPort,
    // });

    // new cdk.CfnOutput(this, "serviceURL", {
    //   value: ekkoService.loadBalancer.loadBalancerDnsName,
    // });

    // new cdk.CfnOutput(this, "loadBalancerName", {
    //   value: loadBalancedFanaService.loadBalancer.loadBalancerName,
    // });

    // new cdk.CfnOutput(this, "loadBalancerFullName", {
    //   value: loadBalancedFanaService.loadBalancer.loadBalancerFullName,
    // });

  }

  addBearerContainerToTask() {
    const fanaBearerImage = ecs.ContainerImage.fromRegistry("public.ecr.aws/n8w7n3f6/fana-flag-bearer");

    const fanaBearerContainer = this.taskDefinition.addContainer('fanaBearerContainer', {
      image: fanaBearerImage,
      environment: {
        REDIS_HOST: props.redis.cluster.attrRedisEndpointAddress,
        REDIS_PORT: props.redis.cluster.attrRedisEndpointPort,
        MANAGER_URI: `http://localhost:${fanaManagerContainer.containerPort}`,
        PORT: process.env.FLAG_BEARER_PORT
      },
      essential: false,
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'fanaBearer' }),
    });

    fanaBearerContainer.addPortMappings(
      {
        containerPort: Number(process.env.FLAG_BEARER_PORT),
        hostPort: Number(process.env.FLAG_BEARER_PORT),
        protocol: ecs.Protocol.TCP,
      }
    );
  }

  addManagerContainerToTask() {
    const fanaManagerImage = ecs.ContainerImage.fromRegistry("public.ecr.aws/n8w7n3f6/fana-manager-static");

    const fanaManagerContainer = this.taskDefinition.addContainer('fanaManagerContainer', {
      image: fanaManagerImage,
      environment: {
        PORT: process.env.MANAGER_PORT,
        REDIS_DB: process.env.REDIS_DB,
        REDIS_HOST: props.redis.cluster.attrRedisEndpointAddress,
        REDIS_PORT: props.redis.cluster.attrRedisEndpointPort,
        DB_HOST: props.postgres.dbInstanceEndpointAddress,
        DB_PORT: props.postgres.dbInstanceEndpointPort,
        DB_PW: process.env.DB_PW, 
        DB_USER: process.env.DB_USER,
        DB_NAME: process.env.DB_NAME,
        SECS_TO_EXPIRE: process.env.SECS_TO_EXPIRE
      },
      essential: true,
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'fanaManager' }),
    });

    fanaManagerContainer.addPortMappings(
      {
        containerPort: Number(process.env.MANAGER_PORT),
        hostPort: Number(process.env.MANAGER_PORT),
        protocol: ecs.Protocol.TCP,
      }
    );
  }

  createSecurityGroup() {
    const sg = new ec2.SecurityGroup(this, 'fana-service-SG', { 
      vpc: props.cluster.vpc,
      description: "Allow connections to Postgres and Redis DBs."
      })

    sg.connections.allowTo(props.postgres, ec2.Port.tcp(5432), "To RDS instance")
    sg.connections.allowTo(props.redis, ec2.Port.tcp(6379), "To Redis instance")
    return sg;
  }
}

module.exports = { FanaStack }