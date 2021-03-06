import * as core from '@actions/core'
import * as fs from 'fs/promises'
import * as tar from 'tar'
import fetch from 'node-fetch'
import { chdir, cwd } from 'process'

async function run(): Promise<void> {
  try {
    const dryRun = core.getInput('dry_run') === 'true'
    const inputDir = core.getInput('input_dir') ?? './'
    const windmillToken = core.getInput('windmill_token')
    const windmillWorkspace = core.getInput('windmill_workspace')
    const windmillUrl =
      core.getInput('windmill_url') ?? 'https://app.windmill.dev'
    const scriptName =
      core.getInput('script_name') ?? 'u/bot/import_workspace_from_tarball'

    core.info(`dryRun: ${dryRun}`)
    core.info(`inputDir: ${inputDir}`)
    core.info(`windmillWorkspace: ${windmillWorkspace}`)
    core.info(`windmillUrl: ${windmillUrl}`)
    core.info(`scriptName: ${scriptName}`)

    chdir(`./${inputDir}`)
    core.info(`base directory: ${cwd()}`)

    await tar.c(
      {
        gzip: false,
        file: 'tarball.tar'
      },
      ['./']
    )
    core.info('tarball has been created')
    const content: string = await fs.readFile('./tarball.tar', {
      encoding: 'base64'
    })
    const settings = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${windmillToken}`
      },
      body: JSON.stringify({
        tarball: content
      })
    }
    core.info(`uploading tarball...`)

    if (!dryRun) {
      const fetchResponse = await fetch(
        `${windmillUrl}/api/w/${windmillWorkspace}/jobs/run/p/${scriptName}`,
        settings
      )
      const output = await fetchResponse.text()
      if (fetchResponse.status >= 300) {
        core.setFailed(`error running script: ${output}`)
      } else {
        core.info(`script run: ${windmillUrl}/run/${output}`)
      }
    } else {
      core.info(`skipping because of dry-run`)
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      core.error(error.message)
      core.setFailed(error.message)
    }
  }
}

run()
