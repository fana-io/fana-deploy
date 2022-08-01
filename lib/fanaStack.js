require('dotenv').config();
const ecs = require('aws-cdk-lib/aws-ecs');
const ecs_patterns = require('aws-cdk-lib/aws-ecs-patterns');
const elbv2 = require('aws-cdk-lib/aws-elasticloadbalancingv2');
const { Stack } = require('aws-cdk-lib'); // root construct representing a single CloudFormation stack
const ec2 = require('aws-cdk-lib/aws-ec2');
const { Group } = require('aws-cdk-lib/aws-iam');

class FanaStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);
    this.postgres = props.postgres;
    this.redis = props.redis;
    this.cluster = props.cluster;

    // task definitions
    this.taskDefinition = new ecs.FargateTaskDefinition(
      this,
      'fanaServiceTaskDefinition',
      {
        memoryLimitMiB: 3072,
        cpu: 1024,
      }
    );

    this.addContainersToTask();
    this.securityGroup = this.createSecurityGroup();
    this.createFanaFargateService();

    // service without LB
    // new ecs.FargateService(this, 'fana-service', {
    //   cluster: this.cluster,
    //   taskDefinition: this.taskDefinition,
    //   securityGroups: [this.securityGroup],
    // });
  }

  createFanaFargateService() {
    // do we need to create a SG and allow traffic to ?
    const fanaFargateService =
      new ecs_patterns.ApplicationLoadBalancedFargateService(
        this,
        'fana-service',
        {
          cluster: this.cluster,
          memoryLimitMiB: 1024,
          desiredCount: 1,
          cpu: 512,
          taskDefinition: this.taskDefinition,
          loadBalancerName: 'fana-LB',
          publicLoadBalancer: true,
          securityGroups: [this.securityGroup],
        }
      );
        
      // ECS has been created & LB has default targetGroup pointing to the manager
      // how to get ECS subnet ip address? 
      const fbTarget = fanaFargateService.service.loadBalancerTarget({
        containerName: 'fanaBearerContainer',
        containerPort: 3001,
      });

    // problem: is this targetType Instance?
    // another problem: no registered target group
    // const bearerTargetGroup = fanaFargateService.listener.addTargets(
    //   'fanaBearerTarget',
    //   {
    //     conditions: [
    //       elbv2.ListenerCondition.pathPatterns(['/connect*', `/stream*`]),
    //     ],
    //     port: 80,
    //     target: [fbTarget], //Can be Instance, IPAddress, or any self-registering load balancing target. All target must be of the same type.
    //     protocol: elbv2.ApplicationProtocol.HTTP,
    //     priority: 11,
    //   }
    // );

    // if we create a bearerTargetGroup - then we can speccify targetType;
        // now, we need to add listenerAction with: condition + bearerTargetGroup

    const fbTargetGroup = new elbv2.ApplicationTargetGroup(
      this,
      'flag-bearer-TG',
      {
        targetType: elbv2.TargetType.IP,
        port: 3001,
        protocol: elbv2.ApplicationProtocol.HTTP,
        // stickinessCookieDuration: Duration.minutes(5),
        vpc: this.cluster.vpc,
      }
    )
    fbTarget.attachToApplicationTargetGroup(fbTargetGroup);

    // add listener action for the bearer paths to the service listener
    fanaFargateService.listener.addAction('bearerStream', {
      priority: 11,
      conditions: [
        elbv2.ListenerCondition.pathPatterns(['/connect*', `/stream*`]),
      ],
      action: elbv2.ListenerAction.forward([fbTargetGroup]),
      
    });
  }

  addContainersToTask() {
    const fanaManagerImage = ecs.ContainerImage.fromRegistry(
      'public.ecr.aws/n8w7n3f6/fana-manager-static'
    );

    const fanaManagerContainer = this.taskDefinition.addContainer(
      'fanaManagerContainer',
      {
        image: fanaManagerImage,
        environment: {
          PORT: process.env.MANAGER_PORT,
          REDIS_DB: process.env.REDIS_DB,
          REDIS_HOST: this.redis.cluster.attrRedisEndpointAddress,
          REDIS_PORT: this.redis.cluster.attrRedisEndpointPort,
          DB_HOST: this.postgres.dbInstanceEndpointAddress,
          DB_PORT: this.postgres.dbInstanceEndpointPort,
          DB_PW: process.env.DB_PW,
          DB_USER: process.env.DB_USER,
          DB_NAME: process.env.DB_NAME,
          SECS_TO_EXPIRE: process.env.SECS_TO_EXPIRE,
        },
        essential: true,
        logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'fanaManager' }),
      }
    );

    fanaManagerContainer.addPortMappings({
      containerPort: Number(process.env.MANAGER_PORT),
      hostPort: Number(process.env.MANAGER_PORT),
      protocol: ecs.Protocol.TCP,
    });

    const fanaBearerImage = ecs.ContainerImage.fromRegistry(
      'public.ecr.aws/n8w7n3f6/fana-flag-bearer'
    );

    const fanaBearerContainer = this.taskDefinition.addContainer(
      'fanaBearerContainer',
      {
        image: fanaBearerImage,
        environment: {
          REDIS_HOST: this.redis.cluster.attrRedisEndpointAddress,
          REDIS_PORT: this.redis.cluster.attrRedisEndpointPort,
          MANAGER_URI: `http://localhost:${fanaManagerContainer.containerPort}`,
          PORT: process.env.FLAG_BEARER_PORT,
        },
        essential: false,
        logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'fanaBearer' }),
      }
    );

    fanaBearerContainer.addPortMappings({
      containerPort: Number(process.env.FLAG_BEARER_PORT),
      hostPort: Number(process.env.FLAG_BEARER_PORT),
      protocol: ecs.Protocol.TCP,
    });
  }

  createSecurityGroup() {
    const sg = new ec2.SecurityGroup(this, 'fana-service-SG', {
      vpc: this.cluster.vpc,
      description: 'Allow connections to Postgres and Redis DBs.',
    });

    sg.connections.allowTo(
      this.postgres,
      ec2.Port.tcp(5432),
      'To RDS instance'
    );
    sg.connections.allowTo(this.redis, ec2.Port.tcp(6379), 'To Redis instance');
    return sg;
  }
}

module.exports = { FanaStack };