import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";

export class FlopboxStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const webPageBucket = this.createWebpageS3Bucket();

    this.createUserDb();

    const flopboxLambda = this.createLambda();

    const api = this.createApiGateway(flopboxLambda);

    this.createCloudfrontDistribution(webPageBucket, api);
  }

  createWebpageS3Bucket() {
    const bucket = new s3.Bucket(this, "FlopboxWebAssets", {
      bucketName: "flopbox-web-assets",
      websiteIndexDocument: "index.html",
      blockPublicAccess: {
        blockPublicPolicy: false,
        blockPublicAcls: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
      publicReadAccess: true,
    });
    bucket.addCorsRule({
      allowedOrigins: ["*"],
      allowedMethods: [s3.HttpMethods.PUT],
      allowedHeaders: ["*"],
    });
    return bucket;
  }

  createUserDb() {
    const vpc = new ec2.Vpc(this, "FlopboxDbVpc", { maxAzs: 2 });

    // Create a security group for the RDS instance
    const rdsSecurityGroup = new ec2.SecurityGroup(this, "DbSecurityGroup", {
      vpc,
      description: "Allow network access to DB",
      allowAllOutbound: true,
    });

    // Allow network access to RDS
    rdsSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      "Allow DB access"
    );

    // Create an RDS database instance
    new rds.DatabaseInstance(this, "FlopboxDb", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_12_18,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.MICRO
      ),
      vpc,
      securityGroups: [rdsSecurityGroup],
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      credentials: rds.Credentials.fromPassword(
        "FlopboxDbUser",
        // Ask your senior dev colleague for the real value and insert it here. Never check it into the git repo!!!
        cdk.SecretValue.unsafePlainText("XXXXXXXXXXXXX Redacted XXXXXXXXXXXXX")
      ),
      multiAz: false,
      allocatedStorage: 20,
      maxAllocatedStorage: 25,
      allowMajorVersionUpgrade: false,
      autoMinorVersionUpgrade: true,
      backupRetention: cdk.Duration.days(0),
      deleteAutomatedBackups: true,
      deletionProtection: false,
      publiclyAccessible: true,
      databaseName: "FlopboxDb",
    });
  }

  createLambda() {
    const flopboxLambda = new lambda.Function(this, "MyLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "dist/index.handler",
      code: new lambda.AssetCode("../lambda"), // Path to Lambda function code
      timeout: cdk.Duration.seconds(30),
    });

    // The lambda needs to be able to create and list user buckets, as well as creating and deleting files
    flopboxLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "s3:CreateBucket",
          "s3:PutObject",
          "s3:PutBucketCors",
          "s3:GetObject",
          "s3:GetBucketCors",
          "s3:DeleteObject",
          "s3:ListObjects",
          "s3:ListBucket",
          "s3:PutBucketPolicy",
        ],
        resources: ["*"],
      })
    );

    return flopboxLambda;
  }

  createApiGateway(flopboxLambda: cdk.aws_lambda.Function) {
    // Define the HTTP API
    const httpApi = new apigatewayv2.HttpApi(this, "FlopboxApi", {
      apiName: "FlopboxApi",
      createDefaultStage: true,
      corsPreflight: {
        allowHeaders: ["Content-Type", "X-Amz-Date", "Authorization"],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.OPTIONS,
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.DELETE,
        ],
        allowCredentials: true,
        allowOrigins: ["http://localhost:3000"], // enable CORS for development
      },
    });

    // Add routes
    httpApi.addRoutes({
      path: "/api/login",
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration(
        "loginIntegration",
        flopboxLambda
      ),
    });

    httpApi.addRoutes({
      path: "/api/register",
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration(
        "registerIntegration",
        flopboxLambda
      ),
    });

    httpApi.addRoutes({
      path: "/api/files",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration(
        "filesIntegration",
        flopboxLambda
      ),
    });

    httpApi.addRoutes({
      path: "/api/files/{key}",
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: new integrations.HttpLambdaIntegration(
        "fileIntegration",
        flopboxLambda
      ),
    });

    return httpApi;
  }

  createCloudfrontDistribution(
    webPageBucket: cdk.aws_s3.Bucket,
    api: cdk.aws_apigatewayv2.HttpApi
  ) {
    const distribution = new cloudfront.Distribution(
      this,
      "FlopboxDistribution",
      {
        defaultRootObject: "index.html",
        defaultBehavior: {
          origin: new origins.S3Origin(webPageBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: new cloudfront.CachePolicy(this, "NoCachePolicy", {
            cachePolicyName: "NoCachePolicy",
            minTtl: cdk.Duration.seconds(0),
            defaultTtl: cdk.Duration.seconds(0),
            maxTtl: cdk.Duration.seconds(0),
            headerBehavior: cloudfront.CacheHeaderBehavior.none(),
            cookieBehavior: cloudfront.CacheCookieBehavior.none(),
            queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
          }),
        },
        additionalBehaviors: {
          "/api/*": {
            origin: new origins.HttpOrigin(
              `${api.httpApiId}.execute-api.${this.region}.amazonaws.com`
            ),
            viewerProtocolPolicy:
              cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
            originRequestPolicy:
              cloudfront.OriginRequestPolicy.fromOriginRequestPolicyId(
                this,
                "AllViewerExceptHostHeader",
                "b689b0a8-53d0-40ab-baf2-68738e2966ac"
              ),
            cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          },
        },
      }
    );

    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: distribution.distributionDomainName,
    });
  }
}
