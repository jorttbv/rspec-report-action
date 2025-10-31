import * as core from '@actions/core'
import * as github from '@actions/github'
import type {RspecResult} from './parse'
import {floor} from './util'

const formatMessage = (message: string): string => {
  const lines = message
    .replace(/\\n/g, '\n')
    .trim()
    .replace(/ /g, '&nbsp;')
    .split(/\n/)
  const [summary, ...bodyLines] = lines
  return `<details>
<summary>${summary}</summary>

${bodyLines.join('<br>')}
</details>
`
}

const slowestExamplesSummary = (result: RspecResult): string => {
  const totalTime = result.totalTime
  const slowTotalTime = result.slowExamples.reduce(
    (total, {runTime}) => total + runTime,
    0
  )
  const percentage = (slowTotalTime / totalTime) * 100
  // eslint-disable-next-line i18n-text/no-en
  return `Top ${result.slowExamples.length} slowest examples (${floor(slowTotalTime, 2)} seconds, ${floor(percentage, 2)}% of total time)`
}

export const reportSummary = async (result: RspecResult): Promise<void> => {
  const icon = result.success ? ':tada:' : ':cold_sweat:'
  const summary = `${icon} ${result.summary}`
  const baseUrl = `${github.context.serverUrl}/${github.context.repo.owner}/${github.context.repo.repo}/blob/${github.context.sha}`
  const title = core.getInput('title', {required: true})
  const profileTitle = core.getInput('profileTitle', {required: true})

  const rows = result.examples.map(
    ({filePath, lineNumber, description, message}) => [
      `\n\n[${filePath}:${lineNumber}](${baseUrl}/${filePath}#L${lineNumber})`,
      description,
      formatMessage(message)
    ]
  )

  const slowestExamplesRows = result.slowExamples.map(
    ({filePath, lineNumber, description, runTime}) => [
      `\n\n[${filePath}:${lineNumber}](${baseUrl}/${filePath}#L${lineNumber})`,
      description,
      String(floor(runTime, 5))
    ]
  )

  await core.summary
    .addHeading(title)
    .addRaw(summary)
    .addBreak()
    .addTable([
      [
        {data: 'Example :link:', header: true},
        {data: 'Description :pencil2:', header: true},
        {data: 'Message :x:', header: true}
      ],
      ...rows
    ])
    .write()

  await core.summary
    .addHeading(profileTitle, 1)
    .addRaw(slowestExamplesSummary(result))
    .addTable([
      [
        {data: 'Example', header: true},
        {data: 'Description', header: true},
        {data: 'Time in seconds', header: true}
      ],
      ...slowestExamplesRows
    ])
    .write()
}
