#!/usr/bin/env node
import { createServer } from 'http';
createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/plain'});res.end('ok');}).listen(9123,()=>console.log('listening 9123'));
