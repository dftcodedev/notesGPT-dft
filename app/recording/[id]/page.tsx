import RecordingPage from './recording';

const Page = async ({ params }: { params: { id: string } }) => {
  const { id } = await Promise.resolve(params);
  return <RecordingPage id={id} />;
};

export default Page;
