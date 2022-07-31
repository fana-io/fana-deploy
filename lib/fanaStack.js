// const cdk = require('@aws-cdk/core'); using aws-cdk-lib instead
const ecs = require("@aws-cdk/aws-ecs");

const { Stack } = require('aws-cdk-lib'); // root construct representing a single CloudFormation stack

class FanaStack extends Stack {
  // /** what is this? this was in the template...
  //  *
  //  * @param {Construct} scope
  //  * @param {string} id
  //  * @param {StackProps=} props
  //  */
  constructor(scope, id, props) {
    super(scope, id, props);

    const fanaManagerImage = ecs.ContainerImage.fromRegistry("public.ecr.aws/n8w7n3f6/fana-manager-static");
    const fanaBearerImage = ecs.ContainerImage.fromRegistry("public.ecr.aws/n8w7n3f6/fana-flag-bearer");

    const fanaServiceTaskDefinition = new ecs.FargateTaskDefinition(this, 'fanaServiceTaskDefinition', {
      memoryLimitMiB: 3072,
      cpu: 1024
    });

    const fanaManagerContainer = fanaServiceTaskDefinition.addContainer('fanaManagerContainer', {
      image: fanaManagerImage,
      environment: {
        PORT: "3000", // is this suppsoed to be string or int
        REDIS_DB: 0,
        REDIS_HOST: props.redis.cluster.attrRedisEndpointAddress,
        REDIS_PORT: props.redis.cluster.attrRedisEndpointPort,
        DB_HOST: props.postgres.instance.dbInstanceEndpointAddress,
        DB_PORT: props.postgres.instance.dbInstanceEndpointPort,
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

    // add service definition with load balancer
  }

}

module.exports = { FanaStack }