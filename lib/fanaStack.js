// const cdk = require('@aws-cdk/core'); using aws-cdk-lib instead
const ecs = require("aws-cdk-lib/aws-ecs");
const ecs_patterns = require("aws-cdk-lib/aws-ecs-patterns");
const elbv2 = require('aws-cdk-lib/aws-elasticloadbalancingv2');
const { Stack } = require('aws-cdk-lib'); // root construct representing a single CloudFormation stack

class FanaStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const fanaManagerImage = ecs.ContainerImage.fromRegistry("public.ecr.aws/n8w7n3f6/fana-manager-static");
    const fanaBearerImage = ecs.ContainerImage.fromRegistry("public.ecr.aws/n8w7n3f6/fana-flag-bearer");
    // task definitions
    const fanaServiceTaskDefinition = new ecs.FargateTaskDefinition(this, 'fanaServiceTaskDefinition', {
      memoryLimitMiB: 3072,
      cpu: 1024
    });

    const fanaManagerContainer = fanaServiceTaskDefinition.addContainer('fanaManagerContainer', {
      image: fanaManagerImage,
      environment: {
        PORT: "3000", // is this suppsoed to be string or int
        REDIS_DB: "0",
        REDIS_HOST: props.redis.cluster.attrRedisEndpointAddress,
        REDIS_PORT: props.redis.cluster.attrRedisEndpointPort,
        DB_HOST: props.postgres.dbInstanceEndpointAddress,
        DB_PORT: props.postgres.dbInstanceEndpointPort,
        // todo: erm, is there .env for env?
        DB_PW: "postgres", 
        DB_USER: "postgres",
        DB_NAME: "postgres",
        SECS_TO_EXPIRE: "1000000s"
      },
      essential: true,
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'fanaManager' }),
    });

    fanaManagerContainer.addPortMappings(
      {
        containerPort: 3000,
        hostPort: 3000,
        protocol: 'tcp',
      }
    );
    
    const fanaBearerContainer = fanaServiceTaskDefinition.addContainer('fanaBearerContainer', {
      image: fanaBearerImage,
      environment: {
        REDIS_HOST: props.redis.cluster.attrRedisEndpointAddress,
        REDIS_PORT: props.redis.cluster.attrRedisEndpointPort,
        // I think this is how you reference the port, but if connection isn't happening--we should check this
        MANAGER_URI: `http://localhost:${fanaManagerContainer.containerPort}`,
        PORT: "3001" // str? int?
      },
      essential: false,
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'fanaBearer' }),
    });

    fanaBearerContainer.addPortMappings(
      {
        containerPort: 3001,
        hostPort: 3001,
        protocol: 'tcp',
      }
    );

    // create service
    // WITHOUT LB
    // const fanaService = 
    // new ecs.FargateService(this, 'fana-service', {
    //   cluster: props.cluster,
    //   taskDefinition: fanaServiceTaskDefinition 
    // });

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
}

module.exports = { FanaStack }