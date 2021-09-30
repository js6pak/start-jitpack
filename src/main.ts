import * as core from "@actions/core";
import * as github from "@actions/github";
import { HttpClient } from "@actions/http-client";

(async () => {
  try {
    const repo = github.context.repo;

    let version: string;

    const ref = github.context.ref;
    if (ref.startsWith("refs/heads/")) {
      const branch = ref.substring("refs/heads/".length);
      version = `${branch}-${github.context.sha.substring(0, 10)}-1`;
    } else if (ref.startsWith("refs/tags/")) {
      version = ref.substring("refs/tags/".length);
    } else {
      core.setFailed("Unable to guess the version text");
      return;
    }

    const url = `https://jitpack.io/com/github/${repo.owner}/${repo.repo}/${version}/build.log`;

    core.info(`Requesting ${url}`);

    const http = new HttpClient();
    const response = await http.get(url);

    if (response.message.statusCode !== 200) {
      core.setFailed(
        `JitPack responded: ${response.message.statusCode} ${response.message.statusMessage}`
      );
      return;
    }

    const text = await response.readBody();

    core.info(text);

    let errored = false;

    for (const line of text.split("\n")) {
      if (line.startsWith("ERROR:")) {
        errored = true;
        core.error(line.substring("ERROR:".length).trim());
      }
    }

    if (errored) {
      core.setFailed("JitPack build failed");
    }
  } catch (error) {
    core.setFailed(error as Error);
  }
})();
