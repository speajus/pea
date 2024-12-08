import { apply } from '@speajus/pea-metrics';
import express from "express";

const app = express();
apply(app);
