// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getIpAddress = (req: any): string => {
  let ipAddress = ((req?.headers && req.headers["x-forwarded-for"]) ||
    req?.connection?.remoteAddress) as string;

  ipAddress = ipAddress?.replace("::ffff:", "");

  return ipAddress;
};

export { getIpAddress };
