#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { FlopboxStack } from "./flopbox-stack";

const app = new cdk.App();

new FlopboxStack(app, "CdkStack", {
  env: {
    account: "122662047093",
    region: "eu-central-1",
  },
});
