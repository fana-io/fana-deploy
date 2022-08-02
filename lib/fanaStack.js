require('dotenv').config();
const ecs = require('aws-cdk-lib/aws-ecs');
const ecs_patterns = require('aws-cdk-lib/aws-ecs-patterns');
const elbv2 = require('aws-cdk-lib/aws-elasticloadbalancingv2');
const { Stack } = require('aws-cdk-lib');
const ec2 = require('aws-cdk-lib/aws-ec2');

class FanaStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);
    this.postgres = props.postgres;
    this.redis = props.redis;
    this.cluster = props.cluster;
    this.taskDefinition = new ecs.FargateTaskDefinition(
      this,
      'fanaServiceTaskDefinition',
      {
        memoryLimitMiB: 3072,
        cpu: 1024,
      }
    );

    this.securityGroup = this.createSecurityGroup();
    this.addContainersToTask();
    this.createFanaFargateService();
  }

  createFanaFargateService() {
    // create service with LB; LB has default targetGroup pointing to the Manager Platform
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
      // create second target for load balancer from fargate service  
      const flagBearerTarget = fanaFargateService.service.loadBalancerTarget({
        containerName: 'fanaBearerContainer',
        containerPort: Number(process.env.FLAG_BEARER_PORT),
      });
    // create a second target group for load balancer
    const flagBearerTargetGroup = new elbv2.ApplicationTargetGroup(
      this,
      'flag-bearer-TG',
      {
        targetType: elbv2.TargetType.IP,
        port: Number(process.env.FLAG_BEARER_PORT),
        protocol: elbv2.ApplicationProtocol.HTTP,
        vpc: this.cluster.vpc,
      }
    )
    flagBearerTarget.attachToApplicationTargetGroup(flagBearerTargetGroup);

    // add listener action for the flag bearer paths to the service listener
    fanaFargateService.listener.addAction('bearerStream', {
      priority: 1, // required to provide a value if you specify conditions
      conditions: [
        elbv2.ListenerCondition.pathPatterns(['/connect*', `/stream*`]),
      ],
      action: elbv2.ListenerAction.forward([flagBearerTargetGroup]),
      
    });
  }

  addContainersToTask() {
    const fanaManagerContainer = this.taskDefinition.addContainer(
      'fanaManagerContainer',
      {
        image: ecs.ContainerImage.fromRegistry('public.ecr.aws/n8w7n3f6/fana-manager-static'),
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

    const fanaBearerContainer = this.taskDefinition.addContainer(
      'fanaBearerContainer',
      {
        image: ecs.ContainerImage.fromRegistry('public.ecr.aws/n8w7n3f6/fana-flag-bearer'),
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

    sg.connections.allowTo(this.postgres, ec2.Port.tcp(5432),'To RDS instance');
    sg.connections.allowTo(this.redis, ec2.Port.tcp(6379), 'To Redis instance');
    return sg;
  }
}

module.exports = { FanaStack };